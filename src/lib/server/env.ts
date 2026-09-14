import 'server-only';

export const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const getAdminEmails = () => {
  return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
};

export const getAdminPassword = () => process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;
