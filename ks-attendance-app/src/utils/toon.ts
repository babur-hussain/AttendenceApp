/**
 * TOON Encoding/Decoding Utilities
 * Converts objects to/from TOON token arrays without using JSON
 */

import { ToonToken } from '../types/toon';
import {
  ToonEncodingError,
  ToonDecodingError,
  ToonValidationError,
  ToonPayloadCorruptedError,
} from '../errors/ToonError';

/**
 * Encode an object to TOON token array
 * Recursively converts object properties to typed tokens
 * 
 * @param obj - Object to encode
 * @param parentKey - Parent key for nested objects (used internally)
 * @returns Array of ToonToken
 */
export function encodeToToon(obj: any, parentKey: string = ''): ToonToken[] {
  const tokens: ToonToken[] = [];

  if (obj === null || obj === undefined) {
    tokens.push({
      type: 'null',
      key: parentKey || 'value',
      value: null,
    });
    return tokens;
  }

  if (Array.isArray(obj)) {
    tokens.push({
      type: 'array',
      key: parentKey,
      value: obj.length,
    });

    for (let i = 0; i < obj.length; i++) {
      const itemKey = parentKey ? `${parentKey}[${i}]` : `[${i}]`;
      tokens.push(...encodeToToon(obj[i], itemKey));
    }

    return tokens;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    
    tokens.push({
      type: 'object',
      key: parentKey || 'root',
      value: keys.length,
    });

    for (const key of keys) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      const value = obj[key];

      if (value === null || value === undefined) {
        tokens.push({
          type: 'null',
          key: fullKey,
          value: null,
        });
      } else if (Array.isArray(value)) {
        tokens.push(...encodeToToon(value, fullKey));
      } else if (typeof value === 'object') {
        tokens.push(...encodeToToon(value, fullKey));
      } else if (typeof value === 'string') {
        tokens.push({
          type: 'string',
          key: fullKey,
          value: value,
        });
      } else if (typeof value === 'number') {
        tokens.push({
          type: 'number',
          key: fullKey,
          value: value,
        });
      } else if (typeof value === 'boolean') {
        tokens.push({
          type: 'boolean',
          key: fullKey,
          value: value,
        });
      }
    }

    return tokens;
  }

  // Primitive types
  if (typeof obj === 'string') {
    tokens.push({
      type: 'string',
      key: parentKey || 'value',
      value: obj,
    });
  } else if (typeof obj === 'number') {
    tokens.push({
      type: 'number',
      key: parentKey || 'value',
      value: obj,
    });
  } else if (typeof obj === 'boolean') {
    tokens.push({
      type: 'boolean',
      key: parentKey || 'value',
      value: obj,
    });
  }

  return tokens;
}

/**
 * Decode TOON token array back to object
 * Reconstructs object structure from typed tokens
 * 
 * @param tokens - Array of ToonToken to decode
 * @returns Decoded object
 */
export function decodeFromToon(tokens: ToonToken[]): any {
  if (tokens.length === 0) {
    return null;
  }

  // Build a map of key-value pairs
  const keyValueMap = new Map<string, any>();
  const arrayLengths = new Map<string, number>();
  const objectKeys = new Map<string, number>();

  for (const token of tokens) {
    if (token.type === 'array') {
      arrayLengths.set(token.key || '', token.value as number);
    } else if (token.type === 'object') {
      objectKeys.set(token.key || '', token.value as number);
    } else {
      keyValueMap.set(token.key || '', token.value);
    }
  }

  // If there's only one root-level primitive, return it
  if (tokens.length === 1 && tokens[0].type !== 'object' && tokens[0].type !== 'array') {
    return tokens[0].value;
  }

  // Reconstruct the object
  const result: any = {};

  for (const [key, value] of keyValueMap.entries()) {
    setNestedValue(result, key, value);
  }

  return result;
}

/**
 * Set a nested value in an object using dot notation
 * Helper function for decodeFromToon
 * 
 * @param obj - Target object
 * @param path - Dot-notation path (e.g., "user.address.city")
 * @param value - Value to set
 */
function setNestedValue(obj: any, path: string, value: any): void {
  if (!path) return;

  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    const isNextArray = !isNaN(Number(nextPart));

    if (!(part in current)) {
      current[part] = isNextArray ? [] : {};
    }

    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

/**
 * Validate TOON tokens structure
 * Ensures tokens array is properly formatted
 * 
 * @param tokens - Tokens to validate
 * @returns True if valid, false otherwise
 */
export function validateToonTokens(tokens: ToonToken[]): boolean {
  if (!Array.isArray(tokens)) {
    return false;
  }

  for (const token of tokens) {
    if (!token.type || !['string', 'number', 'boolean', 'null', 'object', 'array'].includes(token.type)) {
      return false;
    }

    if (token.value === undefined && token.type !== 'null') {
      return false;
    }
  }

  return true;
}

/**
 * Serialize TOON tokens to string for transmission
 * Custom serialization that doesn't use JSON
 * 
 * @param tokens - Tokens to serialize
 * @returns Serialized string
 */
export function serializeToonTokens(tokens: ToonToken[]): string {
  try {
    const parts: string[] = [];

    for (const token of tokens) {
      const type = token.type;
      const key = token.key || '';
      const value = token.value === null ? 'NULL' : String(token.value);
      parts.push(`${type}:${key}:${value}`);
    }

    return parts.join('|');
  } catch (error) {
    throw new ToonEncodingError('Failed to serialize TOON tokens', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Deserialize string back to TOON tokens
 * Custom deserialization that doesn't use JSON
 * 
 * @param serialized - Serialized string
 * @returns Array of ToonToken
 */
export function deserializeToonTokens(serialized: string): ToonToken[] {
  if (!serialized) return [];

  try {
    const parts = serialized.split('|');
    const tokens: ToonToken[] = [];

    for (const part of parts) {
      const [type, key, valueStr] = part.split(':');
      
      let value: any = valueStr;
      
      if (valueStr === 'NULL') {
        value = null;
      } else if (type === 'number') {
        value = Number(valueStr);
      } else if (type === 'boolean') {
        value = valueStr === 'true';
      }

      tokens.push({
        type: type as ToonToken['type'],
        key,
        value,
      });
    }

    return tokens;
  } catch (error) {
    throw new ToonDecodingError('Failed to deserialize TOON tokens', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Encode payload to TOON format for network transmission
 * Returns string or Uint8Array based on size and content
 * 
 * @param payload - Any object to encode
 * @returns Encoded TOON data as string or Uint8Array
 */
export function encodeToToonPayload(payload: any): string | Uint8Array {
  try {
    // Encode to tokens
    const tokens = encodeToToon(payload);
    
    // Validate tokens
    if (!validateToonTokens(tokens)) {
      throw new ToonValidationError('Invalid token structure generated');
    }
    
    // Serialize to string
    const serialized = serializeToonTokens(tokens);
    
    // For large payloads, convert to Uint8Array for efficiency
    if (serialized.length > 10000) {
      const encoder = new TextEncoder();
      return encoder.encode(serialized);
    }
    
    return serialized;
  } catch (error) {
    if (error instanceof ToonEncodingError || error instanceof ToonValidationError) {
      throw error;
    }
    throw new ToonEncodingError('Failed to encode payload to TOON', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Decode TOON format from network transmission
 * Accepts string or Uint8Array and returns decoded object
 * 
 * @param raw - Raw TOON data as string or Uint8Array
 * @returns Decoded object
 */
export function decodeFromToonPayload(raw: string | Uint8Array): any {
  try {
    let serialized: string;
    
    // Convert Uint8Array to string if needed
    if (raw instanceof Uint8Array) {
      const decoder = new TextDecoder();
      serialized = decoder.decode(raw);
    } else {
      serialized = raw;
    }
    
    // Check for corrupted payload
    if (!serialized || serialized.trim().length === 0) {
      throw new ToonPayloadCorruptedError('Payload is empty or corrupted');
    }
    
    // Deserialize tokens
    const tokens = deserializeToonTokens(serialized);
    
    // Validate tokens
    if (!validateToonTokens(tokens)) {
      throw new ToonValidationError('Invalid token structure in payload');
    }
    
    // Decode to object
    const decoded = decodeFromToon(tokens);
    
    return decoded;
  } catch (error) {
    if (
      error instanceof ToonDecodingError ||
      error instanceof ToonValidationError ||
      error instanceof ToonPayloadCorruptedError
    ) {
      throw error;
    }
    throw new ToonDecodingError('Failed to decode TOON payload', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
