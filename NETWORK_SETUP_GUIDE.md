# 🌐 Network Setup Guide

## Quick Start

### 1️⃣ Get Your Local IP Address
```bash
cd ks-attendance-app
npm run get-ip
```

This will display your computer's IP address (e.g., `192.168.29.240`)

### 2️⃣ Configure the App

Edit `ks-attendance-app/.env`:
```bash
EXPO_PUBLIC_API_URL=http://192.168.29.240:3000/api
```
Replace `192.168.29.240` with YOUR computer's IP from step 1.

### 3️⃣ Start Server
```bash
cd server
npm run dev
```

### 4️⃣ Start Mobile App
```bash
cd ks-attendance-app
npm start
```

---

## 📱 Testing Scenarios

### Scenario 1: iOS Simulator (Mac)
**Works with:** `http://localhost:3000/api`
- App automatically uses localhost
- No configuration needed
- Server must be running on port 3000

### Scenario 2: Android Emulator
**Works with:** `http://10.0.2.2:3000/api`
- App automatically uses 10.0.2.2 (emulator's special IP)
- No configuration needed
- Server must be running on port 3000

### Scenario 3: Physical Device (Same WiFi)
**Requirements:**
- ✅ Phone and computer on same WiFi network
- ✅ Set EXPO_PUBLIC_API_URL to computer's IP
- ✅ Server running on port 3000
- ✅ Firewall allows port 3000

**Steps:**
1. Get computer IP: `npm run get-ip`
2. Update `.env`: `EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api`
3. Restart app: `npm start`

**Troubleshooting:**
```bash
# Test if server is reachable from phone
# On phone browser, visit: http://192.168.29.240:3000/health

# If not working, check firewall:
# macOS: System Settings > Network > Firewall > Allow port 3000
# Windows: Windows Defender Firewall > Allow app through firewall
```

### Scenario 4: Physical Device (Mobile Data / Different WiFi)
**Requirements:**
- ✅ Server deployed to cloud
- ✅ Public URL configured

**Steps:**
1. Deploy server (see Production Deployment below)
2. Update `.env`: `EXPO_PUBLIC_PROD_API_URL=https://your-server.com/api`
3. Build production app: `eas build`

---

## 🚀 Production Deployment

### Option A: Railway (Easiest)

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Deploy Server:**
```bash
cd server
railway login
railway init
railway up
```

3. **Get Public URL:**
```bash
railway domain
# Example: https://ks-attendance-production.up.railway.app
```

4. **Update Mobile App:**
```bash
# ks-attendance-app/.env
EXPO_PUBLIC_PROD_API_URL=https://ks-attendance-production.up.railway.app/api
```

### Option B: DigitalOcean App Platform

1. **Create Account:** https://www.digitalocean.com
2. **Create App:** Apps > Create App > GitHub
3. **Configure:**
   - Source: `server/`
   - Build Command: `npm run build`
   - Run Command: `npm start`
   - Port: 3000
4. **Get URL:** `https://your-app.ondigitalocean.app`

### Option C: AWS EC2

1. **Launch EC2 Instance** (Ubuntu 22.04)
2. **SSH and Setup:**
```bash
ssh ubuntu@your-ec2-ip
sudo apt update
sudo apt install nodejs npm
git clone your-repo
cd server
npm install
npm run build
npm start
```

3. **Configure Security Group:**
   - Allow TCP port 3000
   - Get public IP or domain

4. **Use Elastic IP** for permanent address

### Option D: Heroku

1. **Install Heroku CLI:**
```bash
npm install -g heroku
```

2. **Deploy:**
```bash
cd server
heroku login
heroku create ks-attendance-server
git push heroku main
```

3. **Get URL:**
```bash
heroku apps:info
# https://ks-attendance-server.herokuapp.com
```

---

## 🔒 Security Checklist (Production)

### Server Configuration
- [ ] Enable HTTPS/TLS (use Let's Encrypt)
- [ ] Set environment variables for secrets
- [ ] Enable CORS with allowed origins
- [ ] Add rate limiting per IP
- [ ] Use production database (not SQLite)
- [ ] Enable authentication middleware
- [ ] Set up logging and monitoring

### Mobile App Configuration
- [ ] Update production URL in `.env.production`
- [ ] Remove development logging
- [ ] Enable Hermes engine
- [ ] Minify JavaScript
- [ ] Use production builds (EAS Build)

### Example Production `.env`:
```bash
# server/.env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-admin-dashboard.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

---

## 🧪 Testing Connectivity

### From Mobile App
Add to your login screen temporarily:
```typescript
const testConnection = async () => {
  try {
    const response = await fetch('http://192.168.29.240:3000/health');
    const text = await response.text();
    Alert.alert('Server Status', text);
  } catch (error) {
    Alert.alert('Connection Failed', error.message);
  }
};
```

### From Terminal
```bash
# Test health endpoint
curl http://192.168.29.240:3000/health

# Test login endpoint
curl -X POST http://192.168.29.240:3000/api/auth/login \
  -H "Content-Type: text/plain" \
  -d "T1:signin|U1:admin@ksfashion.com|U2:1234"
```

---

## 🐛 Common Issues

### Issue: "Network request failed"
**Cause:** Server not running or wrong URL
**Fix:**
1. Check server is running: `curl http://YOUR_IP:3000/health`
2. Verify IP address: `npm run get-ip`
3. Check `.env` file has correct URL
4. Restart app: `npm start`

### Issue: "Connection refused" on physical device
**Cause:** Firewall blocking port 3000
**Fix:**
```bash
# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /path/to/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /path/to/node

# Or disable firewall temporarily for testing
```

### Issue: Works on WiFi but not mobile data
**Cause:** No public server configured
**Fix:** Deploy to cloud and update `EXPO_PUBLIC_PROD_API_URL`

### Issue: "Invalid credentials" but credentials are correct
**Cause:** Server database not seeded
**Fix:**
```bash
cd server
npm run seed
```

---

## 📊 Current Configuration

Run this to see your current setup:
```bash
cd ks-attendance-app
npm run get-ip
cat .env
```

Should show:
```
Your computer's IP address: 192.168.29.240
EXPO_PUBLIC_API_URL=http://192.168.29.240:3000/api
```

---

## 🎯 Next Steps

1. **Development (Current):**
   - ✅ Local IP configured: `192.168.29.240`
   - ✅ Works on same WiFi network
   - ⏳ Test login with: `employee@ksfashion.com` / `1234`

2. **Production (Required for mobile data):**
   - ⏳ Deploy server to Railway/DigitalOcean
   - ⏳ Get public URL
   - ⏳ Update `EXPO_PUBLIC_PROD_API_URL`
   - ⏳ Build app: `eas build`

---

**Need help?** Check the logs:
```bash
# Server logs
cd server && npm run dev

# Mobile app logs
# Check Metro bundler terminal for errors
```
