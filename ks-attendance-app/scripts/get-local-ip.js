#!/usr/bin/env node

/**
 * Get Local IP Address
 * Helps configure the mobile app to connect to local server
 */

const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIP();

console.log('\n🌐 Local Network Configuration\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Your computer\'s IP address:', ip);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📱 To test on a physical device (same WiFi):\n');
console.log('1. Open: ks-attendance-app/.env');
console.log('2. Set: EXPO_PUBLIC_API_URL=http://' + ip + ':3000/api');
console.log('3. Restart: npm start\n');

console.log('🌍 For production (different network/mobile data):\n');
console.log('1. Deploy server to cloud (AWS, DigitalOcean, etc.)');
console.log('2. Set: EXPO_PUBLIC_PROD_API_URL=https://your-server.com/api');
console.log('3. Build: eas build --platform ios/android\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
