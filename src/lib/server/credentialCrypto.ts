import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getRequiredEnv } from './env';

const PREFIX = 'enc:v1';

const encryptionKey = () => {
  const key = Buffer.from(getRequiredEnv('CREDENTIAL_ENCRYPTION_KEY'), 'base64');
  if (key.length !== 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
};

export const encryptCredential = (value?: string | null) => {
  if (!value) return null;
  if (value.startsWith(`${PREFIX}:`)) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
};

export const decryptCredential = (value: unknown) => {
  if (typeof value !== 'string' || !value) return undefined;
  if (!value.startsWith(`${PREFIX}:`)) return value;

  const [, version, ivValue, tagValue, ciphertextValue] = value.split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Stored credential has an invalid encrypted format.');
  }

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};
