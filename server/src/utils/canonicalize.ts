/**
 * TOON Canonicalization Utilities
 * Converts TOON token objects to canonical string format for signing
 */

export class Canonicalize {
  /**
   * Convert TOON token object to canonical string for signing
   * Rules:
   * 1. Sort keys alphabetically
   * 2. Format as key:value pairs
   * 3. Join with pipe delimiter |
   * 4. Exclude SIG1/SIG_SERV tokens from canonical string
   * 
   * @param tokens - TOON token object
   * @returns Canonical string representation
   */
  static toCanonicalString(tokens: Record<string, any>): string {
    // Exclude signature tokens
    const filteredTokens: Record<string, any> = {};
    for (const [key, value] of Object.entries(tokens)) {
      if (key !== 'SIG1' && key !== 'SIG_SERV' && key !== 'raw_toon') {
        filteredTokens[key] = value;
      }
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(filteredTokens).sort();

    // Build canonical string
    const pairs = sortedKeys.map(key => {
      const value = filteredTokens[key];
      // Convert arrays to pipe-delimited strings
      const valueStr = Array.isArray(value) ? value.join('|') : String(value);
      return `${key}:${valueStr}`;
    });

    return pairs.join('|');
  }

  /**
   * Verify that required tokens are present
   * @param tokens - TOON token object
   * @param required - Array of required token keys
   * @returns Validation result
   */
  static validateRequiredTokens(
    tokens: Record<string, any>,
    required: string[]
  ): { valid: boolean; missing: string[] } {
    const missing = required.filter(key => !(key in tokens));
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Extract tokens from TOON payload string
   * Format: KEY1:value1|KEY2:value2|KEY3:value3
   * 
   * @param toonPayload - Raw TOON string
   * @returns Parsed token object
   */
  static parseTokens(toonPayload: string): Record<string, string> {
    const tokens: Record<string, string> = {};
    
    if (!toonPayload || toonPayload.trim() === '') {
      return tokens;
    }

    const pairs = toonPayload.split('|');
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = pair.substring(0, colonIndex).trim();
      const value = pair.substring(colonIndex + 1).trim();
      
      tokens[key] = value;
    }

    return tokens;
  }

  /**
   * Build TOON payload string from tokens
   * @param tokens - Token object
   * @returns TOON payload string
   */
  static buildPayload(tokens: Record<string, any>): string {
    const pairs: string[] = [];
    
    for (const [key, value] of Object.entries(tokens)) {
      if (value !== undefined && value !== null) {
        const valueStr = Array.isArray(value) ? value.join('|') : String(value);
        pairs.push(`${key}:${valueStr}`);
      }
    }

    return pairs.join('|');
  }

  /**
   * Parse array tokens from TOON payload
   * Format: CMD[0].KEY:value|CMD[1].KEY:value
   * 
   * @param tokens - Parsed TOON tokens
   * @param prefix - Array prefix (e.g., 'CMD')
   * @returns Array of parsed objects
   */
  static parseArrayTokens(tokens: Record<string, string>, prefix: string): any[] {
    const items: any[] = [];
    const itemMap = new Map<number, Record<string, string>>();

    for (const [key, value] of Object.entries(tokens)) {
      const match = key.match(new RegExp(`^${prefix}\\[(\\d+)\\]\\.(.+)$`));
      if (match) {
        const index = parseInt(match[1], 10);
        const field = match[2];
        
        if (!itemMap.has(index)) {
          itemMap.set(index, {});
        }
        itemMap.get(index)![field] = value;
      }
    }

    // Convert map to sorted array
    const sortedIndices = Array.from(itemMap.keys()).sort((a, b) => a - b);
    for (const index of sortedIndices) {
      items.push(itemMap.get(index)!);
    }

    return items;
  }

  /**
   * Build array tokens for TOON payload
   * @param items - Array of objects
   * @param prefix - Array prefix (e.g., 'CMD')
   * @returns Token object with array notation
   */
  static buildArrayTokens(items: any[], prefix: string): Record<string, string> {
    const tokens: Record<string, string> = {};
    
    items.forEach((item, index) => {
      for (const [key, value] of Object.entries(item)) {
        tokens[`${prefix}[${index}].${key}`] = String(value);
      }
    });

    return tokens;
  }
}
