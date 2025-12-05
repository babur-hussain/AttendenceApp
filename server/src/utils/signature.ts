/**
 * Signature Utilities
 * Ed25519 signature generation and verification for TOON protocol
 */

import * as crypto from 'crypto';

export interface KeyPair {
  publicKey: string;  // Base64-encoded
  privateKey: string; // Base64-encoded
}

export class SignatureUtils {
  /**
   * Generate Ed25519 key pair
   */
  static generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return {
      publicKey: Buffer.from(publicKey).toString('base64'),
      privateKey: Buffer.from(privateKey).toString('base64'),
    };
  }

  /**
   * Sign data with private key
   * @param data - String data to sign
   * @param privateKeyPem - PEM-formatted private key
   * @returns Base64-encoded signature
   */
  static sign(data: string, privateKeyPem: string): string {
    const sign = crypto.createSign('ed25519');
    sign.update(data, 'utf8');
    sign.end();
    
    const signature = sign.sign(privateKeyPem);
    return signature.toString('base64');
  }

  /**
   * Verify signature with public key
   * @param data - Original data that was signed
   * @param signature - Base64-encoded signature
   * @param publicKeyPem - PEM-formatted public key
   * @returns True if signature is valid
   */
  static verify(data: string, signature: string, publicKeyPem: string): boolean {
    try {
      const verify = crypto.createVerify('ed25519');
      verify.update(data, 'utf8');
      verify.end();
      
      const signatureBuffer = Buffer.from(signature, 'base64');
      return verify.verify(publicKeyPem, signatureBuffer);
    } catch (error) {
      console.error('[SignatureUtils] Verification error:', error);
      return false;
    }
  }

  /**
   * Convert base64 key to PEM format
   * @param base64Key - Base64-encoded key
   * @param type - 'public' or 'private'
   * @returns PEM-formatted key
   */
  static base64ToPem(base64Key: string, type: 'public' | 'private'): string {
    const keyBuffer = Buffer.from(base64Key, 'base64');
    
    if (type === 'public') {
      return `-----BEGIN PUBLIC KEY-----\n${keyBuffer.toString('base64')}\n-----END PUBLIC KEY-----`;
    } else {
      return `-----BEGIN PRIVATE KEY-----\n${keyBuffer.toString('base64')}\n-----END PRIVATE KEY-----`;
    }
  }

  /**
   * Extract base64 key from PEM format
   * @param pemKey - PEM-formatted key
   * @returns Base64-encoded key
   */
  static pemToBase64(pemKey: string): string {
    return pemKey
      .replace(/-----BEGIN [A-Z\s]+-----/g, '')
      .replace(/-----END [A-Z\s]+-----/g, '')
      .replace(/\s/g, '');
  }

  /**
   * Hash data with SHA256
   * @param data - Data to hash
   * @returns Hex-encoded hash
   */
  static sha256(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random nonce
   * @returns UUID v4 nonce
   */
  static generateNonce(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash nonce for storage (to prevent rainbow table attacks)
   * @param nonce - Original nonce
   * @returns SHA256 hash of nonce
   */
  static hashNonce(nonce: string): string {
    return crypto.createHash('sha256').update(nonce).digest('hex');
  }
}
