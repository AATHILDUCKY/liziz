"use client";

const DEFAULT_MAX_BYTES = 64 * 1024;

function blobToDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read compressed image."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" could not be loaded as an image.`));
    };
    img.src = url;
  });
}

// Not every browser can *encode* WebP via canvas — notably older iPhone Safari,
// which silently downgrades toBlob("image/webp") to PNG. Detect real WebP
// encode support once and fall back to JPEG (well-supported everywhere and
// still small) when it's missing, so uploads work on every device.
let _webpEncode = null;
function supportsWebpEncoding() {
  if (_webpEncode !== null) return _webpEncode;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    _webpEncode = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    _webpEncode = false;
  }
  return _webpEncode;
}

function outputFormat() {
  return supportsWebpEncoding()
    ? { mime: "image/webp", alpha: true }
    : { mime: "image/jpeg", alpha: false };
}

function canvasToBlob(canvas, quality, mime) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Accept whatever the browser produced (it may down-convert the format);
        // only a null blob means the export genuinely failed.
        if (!blob) {
          reject(new Error("This browser could not export the image."));
          return;
        }
        resolve(blob);
      },
      mime,
      quality
    );
  });
}

function drawToCanvas(source, width, height, alpha = true) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha });
  // JPEG has no transparency — paint white first so transparent PNGs (logos,
  // icons) don't come out on a black background.
  if (!alpha) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function dimensionsFor(source, maxSide) {
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// Push quality as high as still fits the byte budget, at a fixed canvas size.
// Assumes the caller already confirmed the size fits at `minQuality` (passed in
// as `lowBlob`), so we only binary-search *upward* — a few encodes, not a full
// sweep from scratch.
async function maximizeQuality(canvas, options, lowBlob) {
  const { minQuality, maxQuality, maxBytes, mime } = options;
  let low = minQuality;
  let high = maxQuality;
  let best = { blob: lowBlob, quality: minQuality };
  for (let i = 0; i < 5; i += 1) {
    const quality = (low + high) / 2;
    const blob = await canvasToBlob(canvas, quality, mime);
    if (blob.size <= maxBytes) {
      best = { blob, quality };
      low = quality;
    } else {
      high = quality;
    }
  }
  return best;
}

export async function compressImageToWebP(file, opts = {}) {
  if (!file) return null;
  if (!file.type?.startsWith("image/")) {
    throw new Error(`"${file.name}" is not an image.`);
  }

  const fmt = outputFormat(); // webp where supported, jpeg on iOS Safari fallback
  const options = {
    maxBytes: opts.maxBytes || DEFAULT_MAX_BYTES,
    maxDimension: opts.maxDimension || 1400,
    minDimension: opts.minDimension || 360,
    minQuality: opts.minQuality || 0.42,
    maxQuality: opts.maxQuality || 0.82,
    mime: fmt.mime,
  };

  const source = await loadImage(file);
  let maxSide = Math.min(
    options.maxDimension,
    Math.max(source.naturalWidth || source.width, source.naturalHeight || source.height)
  );
  let smallest = null; // best-effort fallback if nothing ever fits the budget

  while (maxSide >= options.minDimension) {
    const { width, height } = dimensionsFor(source, maxSide);
    const canvas = drawToCanvas(source, width, height, fmt.alpha);

    // One probe at the LOWEST acceptable quality — the smallest this size can
    // be. If even that overflows, the dimension is simply too big: estimate a
    // smaller one from the measured size (encoded bytes scale ~ pixel area) and
    // jump straight there, without wasting expensive high-quality encodes on a
    // size we already know can't fit.
    const lowBlob = await canvasToBlob(canvas, options.minQuality, options.mime);
    if (!smallest || lowBlob.size < smallest.blob.size) {
      smallest = { blob: lowBlob, quality: options.minQuality, width, height };
    }

    if (lowBlob.size > options.maxBytes) {
      const ratio = options.maxBytes / lowBlob.size;
      const estimate = Math.floor(maxSide * Math.sqrt(ratio) * 0.95);
      maxSide = Math.min(estimate, maxSide - 1);
      continue;
    }

    // This dimension fits — keep the resolution and push quality back up.
    const best = await maximizeQuality(canvas, options, lowBlob);
    return {
      dataUri: await blobToDataUri(best.blob),
      bytes: best.blob.size,
      width,
      height,
      quality: best.quality,
      originalBytes: file.size,
    };
  }

  // Nothing fit even at the minimum dimension (rare) — return the smallest we
  // managed rather than failing the whole upload.
  if (smallest) {
    return {
      dataUri: await blobToDataUri(smallest.blob),
      bytes: smallest.blob.size,
      width: smallest.width,
      height: smallest.height,
      quality: smallest.quality,
      originalBytes: file.size,
    };
  }
  throw new Error(`"${file.name}" could not be compressed under ${formatBytes(options.maxBytes)}.`);
}

// Compress many files with bounded concurrency. `onProgress(done, total)` fires
// after each file so the UI can show live progress.
export async function compressImagesToWebP(files, opts = {}) {
  const { onProgress, ...compressOpts } = opts;
  const list = Array.from(files || []);
  const total = list.length;
  const out = new Array(total);
  let done = 0;
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const i = next++;
      out[i] = await compressImageToWebP(list[i], compressOpts);
      done += 1;
      onProgress?.(done, total);
    }
  }
  const CONCURRENCY = Math.min(3, total || 1);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)}KB`;
}
