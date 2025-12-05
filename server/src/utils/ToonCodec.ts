/**
 * ToonCodec - Server-side TOON encoding/decoding utility
 * NO JSON.parse or JSON.stringify allowed
 */

export type ToonTokenType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export interface ToonToken {
  type: ToonTokenType;
  key: string;
  value: string | number | boolean | null;
}

interface ToonEncodeOptions {
  mode?: 'legacy' | 'typed';
}

export class ToonCodec {
  private static readonly VALID_TOKEN_TYPES: ToonTokenType[] = ['string', 'number', 'boolean', 'null', 'object', 'array'];

  /**
   * Decode TOON payload to object
   * Supports both string and binary formats
   */
  static decode(payload: string | Uint8Array): Record<string, any> {
    const text = typeof payload === 'string' ? payload : Buffer.from(payload).toString('utf-8');

    if (this.looksTypedPayload(text)) {
      try {
        return this.decodeTyped(text);
      } catch (error) {
        console.warn('Typed TOON decode failed, falling back to legacy:', error);
      }
    }

    return this.decodeLegacy(text);
  }

  /**
   * Encode object to TOON payload
   */
  static encode(obj: Record<string, any>, options?: ToonEncodeOptions): string {
    const mode = options?.mode ?? 'legacy';
    return mode === 'typed' ? this.encodeTyped(obj) : this.encodeLegacy(obj);
  }

  /**
   * Legacy decoder used by existing device integrations
   */
  private static decodeLegacy(text: string): Record<string, any> {
    const result: Record<string, any> = {};

    const tokens = text.split('|').filter((t: string) => t.trim());

    for (const token of tokens) {
      const colonIndex = token.indexOf(':');
      if (colonIndex === -1) continue;

      const key = token.substring(0, colonIndex).trim();
      const valueStr = token.substring(colonIndex + 1).trim();
      result[key] = this.parseValue(valueStr);
    }

    return result;
  }

  /**
   * Legacy encoder retained for backward compatibility
   */
  private static encodeLegacy(obj: Record<string, any>): string {
    const tokens: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;

      const encodedValue = this.encodeValue(value);
      tokens.push(`${key}:${encodedValue}`);
    }

    return tokens.join('|');
  }

  /**
   * Determine if payload matches typed TOON format
   */
  private static looksTypedPayload(text: string): boolean {
    if (!text.includes(':')) return false;
    const tokens = text.split('|').filter(Boolean);
    if (tokens.length === 0) return false;

    return tokens.every(token => {
      const parts = token.split(':');
      if (parts.length < 3) return false;
      const [type] = parts;
      return this.VALID_TOKEN_TYPES.includes(type as ToonTokenType);
    });
  }

  /**
   * Encode payload using typed TOON format
   */
  private static encodeTyped(payload: Record<string, any>): string {
    const tokens = this.encodeToTypedTokens(payload);
    if (!this.validateTokens(tokens)) {
      throw new Error('Invalid TOON token structure');
    }
    return this.serializeTokens(tokens);
  }

  /**
   * Decode typed TOON payload
   */
  private static decodeTyped(serialized: string): Record<string, any> {
    const tokens = this.deserializeTokens(serialized);
    if (!this.validateTokens(tokens)) {
      throw new Error('Invalid TOON token structure');
    }
    return this.decodeFromTokens(tokens);
  }

  /**
   * Parse value from string
   */
  private static parseValue(str: string): any {
    // Null
    if (str === 'null') return null;
    
    // Boolean
    if (str === 'true') return true;
    if (str === 'false') return false;
    
    // Number
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return parseFloat(str);
    }
    
    // Array (semicolon-separated)
    if (str.includes(';')) {
      return str.split(';').map(s => this.parseValue(s.trim()));
    }
    
    // Object (nested tokens)
    if (str.includes(',')) {
      const obj: Record<string, any> = {};
      const pairs = str.split(',');
      for (const pair of pairs) {
        const [k, v] = pair.split('=');
        if (k && v) {
          obj[k.trim()] = this.parseValue(v.trim());
        }
      }
      return obj;
    }
    
    // String (remove quotes if present)
    return str.replace(/^["']|["']$/g, '');
  }

  /**
   * Encode value to string
   */
  private static encodeValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    
    if (Array.isArray(value)) {
      return value.map(v => this.encodeValue(v)).join(';');
    }
    
    if (typeof value === 'object') {
      const pairs = Object.entries(value).map(([k, v]) => `${k}=${this.encodeValue(v)}`);
      return pairs.join(',');
    }
    
    // String - escape special characters
    return String(value).replace(/[|:;,=]/g, '_');
  }

  /**
   * Encode object graph into typed tokens
   */
  private static encodeToTypedTokens(obj: any, parentKey: string = ''): ToonToken[] {
    const tokens: ToonToken[] = [];

    if (obj === null || obj === undefined) {
      tokens.push({ type: 'null', key: parentKey || 'value', value: null });
      return tokens;
    }

    if (Array.isArray(obj)) {
      tokens.push({ type: 'array', key: parentKey, value: obj.length });
      obj.forEach((item, index) => {
        const itemKey = parentKey ? `${parentKey}[${index}]` : `[${index}]`;
        tokens.push(...this.encodeToTypedTokens(item, itemKey));
      });
      return tokens;
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      tokens.push({ type: 'object', key: parentKey || 'root', value: keys.length });
      keys.forEach(key => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        tokens.push(...this.encodeToTypedTokens(obj[key], fullKey));
      });
      return tokens;
    }

    const tokenType: ToonTokenType = typeof obj === 'string'
      ? 'string'
      : typeof obj === 'number'
        ? 'number'
        : typeof obj === 'boolean'
          ? 'boolean'
          : 'string';

    tokens.push({ type: tokenType, key: parentKey || 'value', value: obj });
    return tokens;
  }

  /**
   * Validate typed tokens
   */
  private static validateTokens(tokens: ToonToken[]): boolean {
    if (!Array.isArray(tokens) || tokens.length === 0) return false;

    return tokens.every(token => {
      if (!token.type || !this.VALID_TOKEN_TYPES.includes(token.type)) {
        return false;
      }
      return token.type === 'null' || token.value !== undefined;
    });
  }

  /**
   * Serialize typed tokens to string
   */
  private static serializeTokens(tokens: ToonToken[]): string {
    return tokens
      .map(token => {
        const value = token.value === null ? 'NULL' : String(token.value);
        const key = token.key || '';
        return `${token.type}:${key}:${value}`;
      })
      .join('|');
  }

  /**
   * Deserialize typed tokens from string
   */
  private static deserializeTokens(serialized: string): ToonToken[] {
    if (!serialized) return [];

    return serialized.split('|').filter(Boolean).map(part => {
      const [type, key = '', valueStr = ''] = part.split(':');
      let value: any = valueStr;

      if (valueStr === 'NULL') {
        value = null;
      } else if (type === 'number') {
        value = Number(valueStr);
      } else if (type === 'boolean') {
        value = valueStr === 'true';
      }

      return {
        type: type as ToonTokenType,
        key,
        value,
      };
    });
  }

  /**
   * Convert typed tokens back to object graph
   */
  private static decodeFromTokens(tokens: ToonToken[]): any {
    if (tokens.length === 0) {
      return {};
    }

    if (tokens.length === 1 && tokens[0].type !== 'object' && tokens[0].type !== 'array') {
      return tokens[0].value;
    }

    const result: Record<string, any> = {};

    tokens.forEach(token => {
      if (token.type === 'object' || token.type === 'array') {
        return;
      }
      const key = token.key || '';
      if (!key) return;
      this.setNestedValue(result, key, token.value);
    });

    return result;
  }

  /**
   * Helper to set nested value using dot/bracket notation
   */
  private static setNestedValue(target: Record<string, any>, path: string, value: any): void {
    const parts = path.split(/\.|\[|\]/).map(part => part.trim()).filter(Boolean);
    if (parts.length === 0) {
      return;
    }

    let current: any = target;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const isNextIndex = nextPart !== undefined && !isNaN(Number(nextPart));

      if (!(part in current)) {
        current[part] = isNextIndex ? [] : {};
      }

      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Decode multiple events from TOON batch payload
   */
  static decodeBatch(payload: string | Uint8Array): Record<string, any>[] {
    const text = typeof payload === 'string' ? payload : Buffer.from(payload).toString('utf-8');
    
    // Events separated by double pipe
    const eventStrings = text.split('||').filter((e: string) => e.trim());
    
    return eventStrings.map((eventStr: string) => this.decode(eventStr));
  }

  /**
   * Encode multiple events to TOON batch payload
   */
  static encodeBatch(events: Record<string, any>[]): string {
    return events.map(e => this.encode(e)).join('||');
  }
}

/**
 * TOON Schema Validator
 * Returns TOON error tokens instead of throwing exceptions
 */
export class ToonValidator {
  /**
   * Validate attendance event schema
   */
  static validateAttendanceEvent(event: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    // Required tokens
    if (!event.E1) errors.ERR1 = 'missing_token:E1';
    if (!event.A1) errors.ERR2 = 'missing_token:A1';
    if (!event.A2) errors.ERR3 = 'missing_token:A2';
    if (!event.A3) errors.ERR4 = 'missing_token:A3';
    if (!event.D1) errors.ERR5 = 'missing_token:D1';

    // Validate event type
    const validEventTypes = ['IN', 'OUT', 'BREAK_START', 'BREAK_END', 'OVERTIME_IN', 'OVERTIME_OUT'];
    if (event.A2 && !validEventTypes.includes(event.A2)) {
      errors.ERR6 = `invalid_event_type:${event.A2}`;
    }

    // Validate timestamp format
    if (event.A3 && !this.isValidISODate(event.A3)) {
      errors.ERR7 = 'invalid_timestamp_format';
    }

    // Validate location if present
    if (event.L1 && typeof event.L1 === 'object') {
      if (!event.L1.lat || !event.L1.lng) {
        errors.ERR8 = 'invalid_location_format';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate device registration schema
   */
  static validateDeviceRegistration(device: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    if (!device.D1) errors.ERR1 = 'missing_token:D1';
    if (!device.D2) errors.ERR2 = 'missing_token:D2';

    const validDeviceTypes = ['MOBILE', 'KIOSK', 'RPI', 'FINGERPRINT_TERMINAL'];
    if (device.D2 && !validDeviceTypes.includes(device.D2)) {
      errors.ERR3 = `invalid_device_type:${device.D2}`;
    }

    // Validate public key format if present
    if (device.D3 && typeof device.D3 !== 'string') {
      errors.ERR4 = 'invalid_public_key_format';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate report request schema
   */
  static validateReportRequest(request: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    if (!request.R1) errors.ERR1 = 'missing_token:R1';
    if (!request.T1) errors.ERR2 = 'missing_token:T1';
    if (!request.T2) errors.ERR3 = 'missing_token:T2';

    // Validate timestamps
    if (request.T1 && !this.isValidISODate(request.T1)) {
      errors.ERR4 = 'invalid_from_timestamp';
    }
    if (request.T2 && !this.isValidISODate(request.T2)) {
      errors.ERR5 = 'invalid_to_timestamp';
    }

    // Validate output format
    const validFormats = ['XLSX', 'CSV'];
    if (request.O1 && !validFormats.includes(request.O1)) {
      errors.ERR6 = `invalid_output_format:${request.O1}`;
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Check if string is valid ISO date
   */
  private static isValidISODate(str: string): boolean {
    const date = new Date(str);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

/**
 * TOON Response Builder
 * Utility for building standardized TOON responses
 */
export class ToonResponseBuilder {
  /**
   * Build success response
   */
  static success(data: Record<string, any>): string {
    return ToonCodec.encode({
      S1: 'ok',
      ...data,
    });
  }

  /**
   * Build error response
   */
  static error(errors: Record<string, string>): string {
    return ToonCodec.encode({
      S1: 'error',
      ...errors,
    });
  }

  /**
   * Build batch event status response
   */
  static batchEventStatus(
    results: Array<{ eventId: string; status: string; reason?: string }>
  ): string {
    const batches = results.map(r => {
      const tokens: Record<string, any> = {
        A1: r.eventId,
        S1: r.status,
      };
      if (r.reason) {
        tokens.R1 = r.reason;
      }
      return ToonCodec.encode(tokens);
    });

    return batches.join('||');
  }

  /**
   * Build analytics summary response
   */
  static analyticsSummary(summary: {
    totalEmployees: number;
    avgPunctuality: number;
    totalOverBreakMinutes: number;
    totalLateInCount: number;
    reportId?: string;
  }): string {
    return ToonCodec.encode({
      S1: 'ok',
      M1: summary.totalEmployees,
      M2: summary.avgPunctuality,
      M3: summary.totalOverBreakMinutes,
      M4: summary.totalLateInCount,
      M5: summary.reportId || '',
    });
  }
}
