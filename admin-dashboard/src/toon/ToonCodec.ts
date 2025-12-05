/**
 * ToonCodec - Web-compatible TOON encoding/decoding utility
 * NO JSON.parse or JSON.stringify allowed
 */

export interface ToonToken {
  key: string;
  value: string | number | boolean | null | Record<string, any>;
}

export class ToonCodec {
  /**
   * Decode TOON payload to object
   * Supports both string and binary formats
   */
  static decode(payload: string | Uint8Array): Record<string, any> {
    const text = typeof payload === 'string' 
      ? payload 
      : new TextDecoder().decode(payload);
    
    const result: Record<string, any> = {};
    
    // Split by pipe delimiter
    const tokens = text.split('|').filter(t => t.trim());
    
    for (const token of tokens) {
      const colonIndex = token.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = token.substring(0, colonIndex).trim();
      const valueStr = token.substring(colonIndex + 1).trim();
      
      // Parse value type
      result[key] = this.parseValue(valueStr);
    }
    
    return result;
  }

  /**
   * Encode object to TOON payload
   */
  static encode(obj: Record<string, any>): string {
    const tokens: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      
      const encodedValue = this.encodeValue(value);
      tokens.push(`${key}:${encodedValue}`);
    }
    
    return tokens.join('|');
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
   * Decode multiple events from TOON batch payload
   */
  static decodeBatch(payload: string | Uint8Array): Record<string, any>[] {
    const text = typeof payload === 'string' 
      ? payload 
      : new TextDecoder().decode(payload);
    
    // Events separated by double pipe
    const eventStrings = text.split('||').filter(e => e.trim());
    
    return eventStrings.map(eventStr => this.decode(eventStr));
  }

  /**
   * Encode multiple events to TOON batch payload
   */
  static encodeBatch(events: Record<string, any>[]): string {
    return events.map(e => this.encode(e)).join('||');
  }
}
