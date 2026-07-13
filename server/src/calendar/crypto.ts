import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { environment } from '../config/environment.js';

const algorithm = 'aes-256-gcm';

function encryptionKey(): Buffer {
  return createHash('sha256').update(environment.JWT_SECRET).digest();
}

export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptToken(encryptedToken: string): string {
  const [iv, authTag, encrypted] = encryptedToken.split('.');

  if (iv === undefined || authTag === undefined || encrypted === undefined) {
    throw new Error('Encrypted token format is invalid.');
  }

  const decipher = createDecipheriv(
    algorithm,
    encryptionKey(),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
