function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

// Normalize a WhatsApp destination into international digits.
// Supports local Sri Lankan-style mobile numbers like 0771234567 -> 94771234567.
function normalizeWhatsAppNumber(value, defaultCountryCode = "94") {
  let digits = digitsOnly(value);
  if (!digits) return "";

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith(defaultCountryCode) && digits.length >= 10) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 10 && defaultCountryCode) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  return digits;
}

function isValidWhatsAppNumber(value, defaultCountryCode = "94") {
  const normalized = normalizeWhatsAppNumber(value, defaultCountryCode);
  return /^\d{10,15}$/.test(normalized);
}

module.exports = {
  digitsOnly,
  normalizeWhatsAppNumber,
  isValidWhatsAppNumber,
};
