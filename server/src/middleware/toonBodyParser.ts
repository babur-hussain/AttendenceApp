/**
 * Body Parser Middleware for TOON Payloads
 * Accepts both text and binary TOON data
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Parse raw body as text or buffer
 */
export function toonBodyParser(req: Request, res: Response, next: NextFunction): void {
  let data = '';
  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    const buffer = Buffer.concat(chunks);
    
    // Check if binary or text
    const contentType = req.get('Content-Type') || 'text/plain';
    
    if (contentType.includes('application/octet-stream') || contentType.includes('binary')) {
      // Keep as buffer
      req.body = buffer;
    } else {
      // Convert to text
      req.body = buffer.toString('utf-8');
    }
    
    next();
  });

  req.on('error', (err: Error) => {
    console.error('Body parse error:', err);
    res
      .status(400)
      .set('Content-Type', 'text/plain')
      .send('ERR1:body_parse_error');
  });
}
