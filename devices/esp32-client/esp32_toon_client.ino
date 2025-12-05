#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <sodium.h>  // Install "arduino-libsodium"

/* ====== CONFIG ====== */
static const char* WIFI_SSID = "YOUR_WIFI";
static const char* WIFI_PASS = "YOUR_PASS";
static const char* SERVER_URL = "http://192.168.1.100:3000"; // no trailing slash
static const char* DEVICE_ID = "esp32_dev_001";
// Server Ed25519 public key (base64) for verifying SIG_SERV and FW_SIG
static const char* SERVER_PUBLIC_KEY_BASE64 = ""; // REQUIRED

// Optional: pre-provisioned device keys (base64). If empty, generate on first boot and store in NVS
static const char* DEVICE_PRIVATE_KEY_BASE64 = "";
static const char* DEVICE_PUBLIC_KEY_BASE64  = "";

/* ====== STATE ====== */
Preferences prefs;
unsigned long rto_ms = 60000; // default 60s

// simple NONCE tracker (in-memory)
#define MAX_NONCES 16
String nonces[MAX_NONCES];
int nonceIndex = 0;

/* ====== UTIL ====== */
String b64encode(const uint8_t* data, size_t len) {
  // sodium provides base64 variants; Arduino variant can use mbedtls if needed
  // Simple fallback: no newline
  size_t outLen = sodium_base64_encoded_len(len, sodium_base64_VARIANT_ORIGINAL);
  char* out = (char*)malloc(outLen);
  sodium_bin2base64(out, outLen, data, len, sodium_base64_VARIANT_ORIGINAL);
  String s(out);
  free(out);
  return s;
}

bool b64decode(const String& in, uint8_t* out, size_t outMax, size_t* outLen) {
  return sodium_base642bin(out, outMax, in.c_str(), in.length(), NULL, outLen, NULL, sodium_base64_VARIANT_ORIGINAL) == 0;
}

String now_ts() {
  // naive UTC ISO8601 without NTP; acceptable for example
  // use millis as entropy for demo if no RTC/NTP
  char buf[32];
  snprintf(buf, sizeof(buf), "1970-01-01T00:%02lu:%02lu.000Z", (millis()/60000)%60, (millis()/1000)%60);
  return String(buf);
}

String nonce_gen() {
  uint8_t n[16];
  randombytes_buf(n, sizeof(n));
  char hex[33];
  for (int i=0;i<16;i++) sprintf(hex+2*i, "%02x", n[i]);
  return String(hex);
}

void remember_nonce(const String& n) {
  nonces[nonceIndex++ % MAX_NONCES] = n;
}

bool seen_nonce(const String& n) {
  for (int i=0;i<MAX_NONCES;i++) if (nonces[i] == n) return true;
  return false;
}

/* ====== KEYS ====== */
static uint8_t dev_sk[32];
static uint8_t dev_pk[32];

bool load_or_create_keys() {
  prefs.begin("toon", false);
  String sk_b64 = strlen(DEVICE_PRIVATE_KEY_BASE64) ? DEVICE_PRIVATE_KEY_BASE64 : prefs.getString("sk", "");
  String pk_b64 = strlen(DEVICE_PUBLIC_KEY_BASE64)  ? DEVICE_PUBLIC_KEY_BASE64  : prefs.getString("pk", "");
  size_t len = 0;
  if (sk_b64.length() && b64decode(sk_b64, dev_sk, sizeof(dev_sk), &len) && len==32 &&
      pk_b64.length() && b64decode(pk_b64, dev_pk, sizeof(dev_pk), &len) && len==32) {
    return true;
  }
  // generate
  uint8_t seed[32];
  randombytes_buf(seed, 32);
  crypto_sign_seed_keypair(dev_pk, dev_sk, seed);
  String sks = b64encode(dev_sk, 32);
  String pks = b64encode(dev_pk, 32);
  prefs.putString("sk", sks);
  prefs.putString("pk", pks);
  return true;
}

String canonicalize(const String keys[], const String values[], int count) {
  // naive: insertion sort by key and join key:value|...
  int order[count];
  for (int i=0;i<count;i++) order[i]=i;
  for (int i=0;i<count;i++) for (int j=i+1;j<count;j++) if (keys[order[j]] < keys[order[i]]) { int t=order[i]; order[i]=order[j]; order[j]=t; }
  String out;
  for (int k=0;k<count;k++) {
    int idx = order[k];
    if (keys[idx].startsWith("SIG") || keys[idx]=="FW_SIG" || keys[idx]=="SIG_SERV") continue;
    if (out.length()) out += "|";
    out += keys[idx] + ":" + values[idx];
  }
  return out;
}

String build_payload(const String keys[], const String values[], int count) {
  String out;
  for (int i=0;i<count;i++) {
    if (i) out += "|";
    out += keys[i] + ":" + values[i];
  }
  return out;
}

String sign_detached(const String& msg) {
  uint8_t sig[64];
  crypto_sign_detached(sig, NULL, (const unsigned char*)msg.c_str(), msg.length(), dev_sk);
  return b64encode(sig, 64);
}

bool verify_server(const String& msg, const String& sig_b64) {
  if (!strlen(SERVER_PUBLIC_KEY_BASE64)) return false;
  uint8_t pk[32]; size_t pklen=0;
  if (!b64decode(String(SERVER_PUBLIC_KEY_BASE64), pk, sizeof(pk), &pklen) || pklen!=32) return false;
  uint8_t sig[64]; size_t siglen=0;
  if (!b64decode(sig_b64, sig, sizeof(sig), &siglen) || siglen!=64) return false;
  return crypto_sign_verify_detached(sig, (const unsigned char*)msg.c_str(), msg.length(), pk) == 0;
}

/* ====== HTTP ====== */
bool http_post(const String& path, const String& payload, String& out) {
  HTTPClient http;
  String url = String(SERVER_URL) + path;
  http.begin(url);
  http.addHeader("Content-Type", "text/plain");
  http.addHeader("Accept", "text/plain");
  int code = http.POST((uint8_t*)payload.c_str(), payload.length());
  if (code <= 0) { http.end(); return false; }
  out = http.getString();
  http.end();
  return true;
}

bool http_get(const String& path, const String& toonQuery, String& out) {
  HTTPClient http;
  String url = String(SERVER_URL) + path + "?toon=" + toonQuery; // NOTE: minimal encoding
  http.begin(url);
  http.addHeader("Accept", "text/plain");
  int code = http.GET();
  if (code <= 0) { http.end(); return false; }
  out = http.getString();
  http.end();
  return true;
}

/* ====== TOON PARSE ====== */
String getToken(const String& payload, const char* key) {
  int start = 0;
  while (true) {
    int sep = payload.indexOf('|', start);
    String part = (sep==-1) ? payload.substring(start) : payload.substring(start, sep);
    int colon = part.indexOf(':');
    if (colon>0) {
      String k = part.substring(0, colon);
      if (k == key) return part.substring(colon+1);
    }
    if (sep==-1) break;
    start = sep+1;
  }
  return String("");
}

/* ====== FLOWS ====== */
void register_device() {
  String nonce = nonce_gen();
  remember_nonce(nonce);
  String keys[7] = {"D1","D2","D3","D4","D5","TS","NONCE"};
  String vals[7] = {DEVICE_ID,"ESP32_TERMINAL", b64encode(dev_pk,32), "Espressif", "ESP32", now_ts(), nonce};
  String canon = canonicalize(keys, vals, 7);
  String sig = sign_detached(canon);
  String sendKeys[8]; String sendVals[8];
  for (int i=0;i<7;i++){sendKeys[i]=keys[i];sendVals[i]=vals[i];}
  sendKeys[7]="SIG1"; sendVals[7]=sig;
  String payload = build_payload(sendKeys, sendVals, 8);
  String resp;
  http_post("/api/devices/register", payload, resp);
}

void heartbeat_once() {
  String nonce = nonce_gen(); if (seen_nonce(nonce)) nonce = nonce_gen(); remember_nonce(nonce);
  String keys[11] = {"D1","HB1","HB2","HB3","HB4","HB5","HB6","FW2","TS","NONCE","_"};
  String vals[11] = {DEVICE_ID, String("hb_")+String(millis()), "60", "8", "40.0", "1970-01-01T00:00:00.000Z", "ONLINE", "1.0.0", now_ts(), nonce, "_"};
  String canon = canonicalize(keys, vals, 10);
  String sig = sign_detached(canon);
  String sendKeys[11]; String sendVals[11];
  for (int i=0;i<10;i++){sendKeys[i]=keys[i];sendVals[i]=vals[i];}
  sendKeys[10] = "SIG1"; sendVals[10] = sig;
  String payload = build_payload(sendKeys, sendVals, 11);
  String resp;
  if (http_post("/api/devices/heartbeat", payload, resp)) {
    String rto = getToken(resp, "RTO");
    if (rto.length()) rto_ms = rto.toInt() * 1000UL;
  }
}

void poll_commands() {
  String nonce = nonce_gen(); remember_nonce(nonce);
  String keys[3] = {"D1","TS","NONCE"};
  String vals[3] = {DEVICE_ID, now_ts(), nonce};
  String canon = canonicalize(keys, vals, 3);
  String sig = sign_detached(canon);
  String sendKeys[4] = {"D1","TS","NONCE","SIG1"};
  String sendVals[4] = {DEVICE_ID, vals[1], nonce, sig};
  String query = build_payload(sendKeys, sendVals, 4);
  String resp;
  http_get("/api/devices/commands", query, resp);
  // Parse and verify individual commands as needed
}

/* ====== SETUP/LOOP ====== */
void setup() {
  Serial.begin(115200);
  delay(1000);
  if (sodium_init() < 0) {
    Serial.println("sodium init failed");
  }
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi connected");
  load_or_create_keys();
  register_device();
}

unsigned long lastBeat = 0;
void loop() {
  unsigned long now = millis();
  if (now - lastBeat >= rto_ms) {
    lastBeat = now;
    heartbeat_once();
    poll_commands();
  }
  delay(50);
}
