import { ToonCodec } from './ToonCodec';

export interface ToonClientConfig {
  baseURL: string;
  authToken?: string;
}

export class ToonClient {
  private baseURL: string;
  private authToken?: string;

  constructor(config: ToonClientConfig) {
    this.baseURL = config.baseURL;
    this.authToken = config.authToken;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.authToken = undefined;
  }

  /**
   * Perform TOON GET request
   * Returns decoded TOON object
   */
  async toonGet(endpoint: string): Promise<Record<string, any>> {
    const headers: HeadersInit = {
      'Content-Type': 'text/plain',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = ToonCodec.decode(errorText);
      throw new Error(errorData.ERR || `Request failed: ${response.statusText}`);
    }

    const text = await response.text();
    return ToonCodec.decode(text);
  }

  /**
   * Perform TOON POST request
   * Accepts object, encodes to TOON, returns decoded TOON response
   */
  async toonPost(
    endpoint: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    const headers: HeadersInit = {
      'Content-Type': 'text/plain',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const toonPayload = ToonCodec.encode(data);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: toonPayload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = ToonCodec.decode(errorText);
      throw new Error(errorData.ERR || `Request failed: ${response.statusText}`);
    }

    const text = await response.text();
    return ToonCodec.decode(text);
  }

  /**
   * Perform TOON PUT request
   * Accepts object, encodes to TOON, returns decoded TOON response
   */
  async toonPut(
    endpoint: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    const headers: HeadersInit = {
      'Content-Type': 'text/plain',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const toonPayload = ToonCodec.encode(data);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: toonPayload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = ToonCodec.decode(errorText);
      throw new Error(errorData.ERR || `Request failed: ${response.statusText}`);
    }

    const text = await response.text();
    return ToonCodec.decode(text);
  }

  /**
   * Perform TOON DELETE request
   * Returns decoded TOON response
   */
  async toonDelete(endpoint: string): Promise<Record<string, any>> {
    const headers: HeadersInit = {
      'Content-Type': 'text/plain',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = ToonCodec.decode(errorText);
      throw new Error(errorData.ERR || `Request failed: ${response.statusText}`);
    }

    const text = await response.text();
    return ToonCodec.decode(text);
  }

  /**
   * Perform TOON batch POST request
   * Accepts array of objects, encodes to TOON batch, returns decoded TOON response
   */
  async toonPostBatch(
    endpoint: string,
    dataArray: Record<string, any>[]
  ): Promise<Record<string, any>> {
    const headers: HeadersInit = {
      'Content-Type': 'text/plain',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const toonPayload = ToonCodec.encodeBatch(dataArray);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: toonPayload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = ToonCodec.decode(errorText);
      throw new Error(errorData.ERR || `Request failed: ${response.statusText}`);
    }

    const text = await response.text();
    return ToonCodec.decode(text);
  }

  /**
   * Download binary XLSX file
   * Returns Blob for download
   */
  async toonDownload(endpoint: string): Promise<Blob> {
    const headers: HeadersInit = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Try to parse error as TOON
      const errorText = await response.text();
      const errorData = ToonCodec.decode(errorText);
      throw new Error(errorData.ERR || `Download failed: ${response.statusText}`);
    }

    // Return binary blob
    return await response.blob();
  }

  /**
   * Helper to trigger browser download from blob
   */
  static triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
