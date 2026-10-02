const MOBILE_LENGTH = 11;

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, MOBILE_LENGTH);
}

export function formatPhone(value: string): string {
  const digits = normalizePhone(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidMobilePhone(value: string): boolean {
  return /^[1-9]{2}9\d{8}$/.test(normalizePhone(value));
}
