import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function buildKey(rawKey: string): Buffer {
  return createHash('sha256').update(rawKey).digest();
}

export function encryptSecret(plainText: string, keyMaterial: string): string {
  const iv = randomBytes(12);
  const key = buildKey(keyMaterial);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(cipherText: string, keyMaterial: string): string {
  if (!cipherText.startsWith(PREFIX)) return cipherText;
  const payload = cipherText.slice(PREFIX.length);
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Invalid encrypted secret format');
  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const data = Buffer.from(dataPart, 'base64url');
  const key = buildKey(keyMaterial);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

