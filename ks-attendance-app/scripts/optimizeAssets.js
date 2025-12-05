#!/usr/bin/env node

/**
 * Asset Optimization Script
 * 
 * Compresses PNG/JPG images to WebP format.
 * Requires: sharp (npm install --save-dev sharp)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Sharp is not installed. Run: npm install --save-dev sharp');
  process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, '../assets');
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg'];

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_FORMATS.includes(ext)) return;
  
  const outputPath = filePath.replace(/\.(png|jpe?g)$/i, '.webp');
  
  try {
    const originalSize = fs.statSync(filePath).size;
    
    await sharp(filePath)
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    const newSize = fs.statSync(outputPath).size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(filePath)} → ${path.basename(outputPath)} (${savings}% smaller)`);
  } catch (error) {
    console.error(`❌ Failed to optimize ${filePath}:`, error.message);
  }
}

async function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      await walkDirectory(filePath);
    } else {
      await optimizeImage(filePath);
    }
  }
}

async function main() {
  console.log('🖼️  Optimizing assets...\n');
  
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`❌ Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }
  
  await walkDirectory(ASSETS_DIR);
  
  console.log('\n✅ Asset optimization complete!');
  console.log('💡 Tip: Update image imports to use .webp extension');
}

main().catch(console.error);
