import Image from "next/image";

// Local brand images get responsive Next.js optimization. Admin-uploaded and
// external images retain the existing image delivery behavior.
export default function EditorialImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
}) {
  if (!src) return null;
  if (src.startsWith("/images/liziz-")) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
}
