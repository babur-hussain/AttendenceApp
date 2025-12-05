#!/usr/bin/env node
/**
 * Export server Ed25519 public key in base64 (raw 32 bytes) for devices.
 * Reads SERVER_PRIVATE_KEY from env (PEM or base64-of-PEM), derives public key,
 * and prints:
 *   SERVER_PUBLIC_KEY_BASE64=<base64-raw-32-bytes>
 */
const crypto = require('crypto');

function toPem(maybeBase64OrPem) {
  const s = (maybeBase64OrPem || '').trim();
  if (!s) return '';
  if (s.includes('BEGIN') && s.includes('END')) return s; // already PEM
  try {
    const buf = Buffer.from(s, 'base64');
    const text = buf.toString('utf8');
    if (text.includes('BEGIN') && text.includes('END')) return text;
  } catch {}
  // Assume it's raw PKCS8 DER base64 (rare). Wrap as PEM if needed.
  return `-----BEGIN PRIVATE KEY-----\n${s}\n-----END PRIVATE KEY-----`;
}

function base64UrlToBase64(b64u) {
  return b64u.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64u.length / 4) * 4, '=');
}

(function main() {
  const privEnv = process.env.SERVER_PRIVATE_KEY || '';
  if (!privEnv) {
    console.error('ERROR: SERVER_PRIVATE_KEY env not set.');
    process.exit(1);
  }
  const pem = toPem(privEnv);
  try {
    const privKey = crypto.createPrivateKey({ key: pem, format: 'pem', type: 'pkcs8' });
    const pubKey = crypto.createPublicKey(privKey);
    // Export as JWK to get raw Ed25519 public key bytes (x)
    const jwk = pubKey.export({ format: 'jwk' });
    if (!jwk || !jwk.x) throw new Error('Failed to export JWK.');
    const raw = Buffer.from(base64UrlToBase64(jwk.x), 'base64');
    if (raw.length !== 32) throw new Error(`Unexpected public key length: ${raw.length}`);
    console.log(`SERVER_PUBLIC_KEY_BASE64=${raw.toString('base64')}`);
  } catch (e) {
    console.error('ERROR deriving public key:', e.message);
    process.exit(2);
  }
})();
