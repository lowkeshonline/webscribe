const telegramPattern = /^@?[A-Za-z0-9_]{5,32}$/;
const indianWhatsappPattern = /^(?:[6-9]\d{9}|(?:\+91|91)[ -]?[6-9]\d{9})$/;
const emailPattern = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const nameToken = String.raw`(?:[\p{L}\p{M}]+(?:['-][\p{L}\p{M}]+)*|(?:[\p{L}\p{M}]\.)+)`;
const fullNamePattern = new RegExp(`^${nameToken}(?: ${nameToken})*$`, 'u');

export const TELEGRAM_USERNAME_PATTERN = telegramPattern.source;
export const INDIAN_WHATSAPP_PATTERN = indianWhatsappPattern.source;
export const EMAIL_PATTERN = emailPattern.source;

export const isValidTelegramUsername = (value: string) => telegramPattern.test(value.trim());

export const normalizeIndianWhatsappNumber = (value: string) => {
  const trimmed = value.trim();
  if (!indianWhatsappPattern.test(trimmed)) return null;
  const compact = trimmed.replace(/[ -]/g, '');
  const localNumber = compact.length === 10
    ? compact
    : compact.replace(/^(?:\+91|91)/, '');
  return /^[6-9]\d{9}$/.test(localNumber) ? localNumber : null;
};

export const isValidIndianWhatsappNumber = (value: string) => normalizeIndianWhatsappNumber(value) !== null;

export const isValidEmail = (value: string) => value.trim().length <= 254 && emailPattern.test(value.trim());

export const isValidFullName = (value: string) => {
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 120 && fullNamePattern.test(name);
};

export const sanitizeTelegramInput = (value: string) => value
  .replace(/[^A-Za-z0-9_@]/g, '')
  .replace(/(?!^)@/g, '')
  .slice(0, 33);

export const sanitizeIndianWhatsappInput = (value: string) => value
  .replace(/[^0-9+ -]/g, '')
  .replace(/(?!^)\+/g, '')
  .slice(0, 16);

export const sanitizeFullNameInput = (value: string) => value
  .replace(/[^\p{L}\p{M} .'-]/gu, '')
  .replace(/\s{2,}/g, ' ')
  .slice(0, 120);
