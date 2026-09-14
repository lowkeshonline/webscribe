import 'server-only';

import { getAdminEmails } from './env';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isAdminEmail = (email: string) => {
  return getAdminEmails().includes(normalizeEmail(email));
};

export const assertAdminEmail = (email: string) => {
  if (!isAdminEmail(email)) {
    throw new Error('Forbidden: admin access required.');
  }
};
