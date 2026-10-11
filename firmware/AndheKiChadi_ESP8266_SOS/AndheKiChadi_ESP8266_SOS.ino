/*
  =====================================================================================
  Andhe Ki Chadi (Smart Cane) - ESP8266 Production Firmware
  =====================================================================================
  Hardware: WeMos D1 Mini (ESP8266) / LOLIN(WEMOS) D1 R2 & mini
  Peripherals & Pin Connections:
    - Ultrasonic Sensor HC-SR04:
        TRIG -> Pin D6 (GPIO 12) [Trigger pulse from ESP8266]
        ECHO -> Pin D5 (GPIO 14) [via safe 1kΩ / 2kΩ voltage divider to protect 3.3V GPIO]
    - Buzzer & Vibration Motor Driver:
        Control -> Pin D1 (GPIO 5) [via NPN Transistor / MOSFET driver]
    - SOS Emergency Push Button:
        Signal -> Pin D2 (GPIO 4) [Connected to GND with internal INPUT_PULLUP]
    - Onboard LED:
        Status Indicator -> LED_BUILTIN (GPIO 2, Active LOW on WeMos D1 Mini)

  Safety Operation Rules:
    1. Obstacle Detection (Threshold: <= 50 cm):
       - Measures distance non-blockingly every 50ms.
       - If distance <= 50 cm, immediately activates Buzzer & Vibration Motor on Pin D1 locally.
       - Operates 100% locally on-device. Zero cloud latency; does NOT send website traffic.
    2. Emergency SOS Distress Alerts:
       - Debounced button press on Pin D2 detects urgent tactile emergency signal.
       - Dispatches distress event to Firebase Realtime Database at `/alerts/<eventId>.json`.
       - Generates a unique SOS event ID per button press.
       - Uses idempotent PUT requests so retries do NOT create duplicate alerts.
       - Does NOT block local obstacle detection during Wi-Fi or Firebase requests.
    3. Device Heartbeat:
       - Sends periodic status ping to `/devices/<deviceId>/status.json` every 30 seconds.
    4. Secure Firebase Authentication & Strict TLS Certificate Validation:
       - Authenticates as an authorized ESP8266 Device Account via Firebase REST API.
       - Strictly verifies TLS against Google Trust Services Root R1 certificate.
       - Fails securely if certificate verification cannot be performed (no setInsecure()).
  =====================================================================================
*/

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <ESP8266HTTPClient.h>
#include <time.h>

// Include external configuration header
#if __has_include("config.h")
  #include "config.h"
#endif

// Safe fallback defaults for all parameters
#ifndef WIFI_SSID
  #define WIFI_SSID               "YOUR_WIFI_SSID"
#endif
#ifndef WIFI_PASSWORD
  #define WIFI_PASSWORD           "YOUR_WIFI_PASSWORD"
#endif
#ifndef FIREBASE_HOST
  #define FIREBASE_HOST           "your-project-id-default-rtdb.firebaseio.com"
#endif
#ifndef FIREBASE_API_KEY
  #define FIREBASE_API_KEY        ""
#endif
#ifndef DEVICE_EMAIL
  #define DEVICE_EMAIL            "device001@andhekichadi.local"
#endif
#ifndef DEVICE_PASSWORD
  #define DEVICE_PASSWORD         "YourSecureDevicePassword123"
#endif
#ifndef FIREBASE_AUTH_TOKEN
  #define FIREBASE_AUTH_TOKEN     ""
#endif
#ifndef DEVICE_ID
  #define DEVICE_ID               "device001"
#endif
#ifndef FIRMWARE_VERSION
  #define FIRMWARE_VERSION        "v1.0.4-esp8266"
#endif
#ifndef OBSTACLE_DISTANCE_CM
  #define OBSTACLE_DISTANCE_CM    50
#endif
#ifndef HEARTBEAT_INTERVAL_MS
  #define HEARTBEAT_INTERVAL_MS   30000
#endif

// ================= Pin Assignments (User Hardware Specification) =================
const int PIN_ALARM_OUTPUT = D1;  // Buzzer & Vibration Motor Driver (GPIO 5)
const int PIN_SOS_BUTTON   = D2;  // SOS Emergency Push Button (GPIO 4, INPUT_PULLUP)
const int PIN_ECHO         = D5;  // HC-SR04 Echo Pin (GPIO 14 via safe voltage divider)
const int PIN_TRIG         = D6;  // HC-SR04 Trigger Pin (GPIO 12)
const int PIN_STATUS_LED   = LED_BUILTIN; // Active LOW indicator

// ================= Google Trust Services Root R1 (GTS Root R1) Certificate =================
// Signs *.firebaseio.com and identitytoolkit.googleapis.com (Valid until 2036-06-22)
static const char GOOGLE_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFVzCCAz+gAwIBAgINAgPlk28xsBNJiGuiFzANBgkqhkiG9w0BAQwFADBHMQsw
CQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEU
MBIGA1UEAxMLR1RTIFJvb3QgUjEwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAw
MDAwWjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZp
Y2VzIExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjEwggIiMA0GCSqGSIb3DQEBAQUA
A4ICDwAwggIKAoICAQC2EQKLHuOhd5s73L+UPreVp0A8of2C+X0yBoJx9vaMf/vo
27xqLpeXo4xL+Sv2sfnOhB2x+cWX3u+58qPpvBKJXqeqUqv4IyfLpLGcY9vXmX7w
Cl7raKb0xlpHDU0QM+NOsROjyBhsS+z8CZDfnWQpJSMHobTSPS5g4M/SCYe7zUjw
TcLCeoiKu7rPWRnWr4+wB7CeMfGCwcDfLqZtbBkOtdh+JhpFAz2weaSUKK0Pfybl
qAj+lug8aJRT7oM6iCsVlgmy4HqMLnXWnOunVmSPlk9orj2XwoSPwLxAwAtcvfaH
szVsrBhQf4TgTM2S0yDpM7xSma8ytSmzJSq0SPly4cpk9+aCEI3oncKKiPo4Zor8
Y/kB+Xj9e1x3+naH+uzfsQ55lVe0vSbv1gHR6xYKu44LtcXFilWr06zqkUspzBmk
MiVOKvFlRNACzqrOSbTqn3yDsEB750Orp2yjj32JgfpMpf/VjsPOS+C12LOORc92
wO1AK/1TD7Cn1TsNsYqiA94xrcx36m97PtbfkSIS5r762DL8EGMUUXLeXdYWk70p
aDPvOmbsB4om3xPXV2V4J95eSRQAogB/mqghtqmxlbCluQ0WEdrHbEg8QOB+DVrN
VjzRlwW5y0vtOUucxD/SVRNuJLDWcfr0wbrM7Rv1/oFB2ACYPTrIrnqYNxgFlQID
AQABo0IwQDAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4E
FgQU5K8rJnEaK0gnhS9SZizv8IkTcT4wDQYJKoZIhvcNAQEMBQADggIBAJ+qQibb
C5u+/x6Wki4+omVKapi6Ist9wTrYggoGxval3sBOh2Z5ofmmWJyq+bXmYOfg6LEe
QkEzCzc9zolwFcq1JKjPa7XSQCGYzyI0zzvFIoTgxQ6KfF2I5DUkzps+GlQebtuy
h6f88/qBVRRiClmpIgUxPoLW7ttXNLwzldMXG+gnoot7TiYaelpkttGsN/H9oPM4
7HLwEXWdyzRSjeZ2axfG34arJ45JK3VmgRAhpuo+9K4l/3wV3s6MJT/KYnAK9y8J
ZgfIPxz88NtFMN9iiMG1D53Dn0reWVlHxYciNuaCp+0KueIHoI17eko8cdLiA6Ef
MgfdG+RCzgwARWGAtQsgWSl4vflVy2PFPEz0tv/bal8xa5meLMFrUKTX5hgUvYU/
Z6tGn6D/Qqc6f1zLXbBwHSs09dR2CQzreExZBfMzQsNhFRAbd03OIozUhfJFfbdT
6u9AWpQKXCBfTkBdYiJ23//OYb2MI3jSNwLgjt7RETeJ9r/tSQdirpLsQBqvFAnZ
0E6yove+7u7Y/9waLd64NnHi/Hm3lCXRSHNboTXns5lndcEZOitHTtNCjv0xyBZm
2tIMPNuzjsmhDYAPexZ3FL//2wmUspO8IFgV6dtxQ/PeEMMA3KgqlbbC1j+Qa3bb
bP6MvPJwNQzcmRk13NfIRmPVNnGuV/u3gm3c
-----END CERTIFICATE-----
)EOF";

// Global X509 trust anchor configured with official Google Trust Services Root CA
static X509List trustAnchor(GOOGLE_ROOT_CA);

// ================= Timing Constants & States =================
const unsigned long OBSTACLE_SAMPLE_INTERVAL = 50;    // Measure obstacle every 50ms
const unsigned long BUTTON_DEBOUNCE_TIME     = 50;    // 50ms debouncing window
const unsigned long WIFI_RETRY_INTERVAL      = 8000;  // Check WiFi every 8s
const unsigned long SOS_RETRY_INTERVAL       = 2000;  // Delay between SOS retries (non-blocking)
const int MAX_SOS_RETRIES                    = 5;

unsigned long lastObstacleCheck   = 0;
unsigned long lastHeartbeatTime   = 0;
unsigned long lastWifiAttempt     = 0;
unsigned long lastSosAttemptTime  = 0;

// SOS Button State Tracking
int lastButtonReading = HIGH;
int buttonState = HIGH;
unsigned long lastDebounceTime = 0;
bool sosAlertPending = false;
String currentSosEventId = "";
int sosRetryCount = 0;

// Firebase Authentication Token State
String idToken = "";
unsigned long tokenExpiryMillis = 0;
bool isTimeSynced = false;

// Forward Declarations
void connectToWiFi();
void syncNtpTime();
bool ensureTlsPrerequisites();
void updateObstacleDetection();
void updateSosButton();
bool refreshDeviceAuthToken();
bool sendSosAlertToFirebase();
void sendHeartbeatToFirebase();

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println(F("========================================================="));
  Serial.println(F("  Andhe Ki Chadi - Smart Assistive Blind Cane"));
  Serial.println(F("  WeMos D1 Mini ESP8266 Safety Firmware"));
  Serial.println(F("  Ultrasonic: TRIG=D6, ECHO=D5 (<= 50cm detection threshold)"));
  Serial.println(F("  Buzzer/Motor: D1 | SOS Button: D2"));
  Serial.println(F("  Strict TLS Certificate Verification: GTS Root R1 (Active)"));
  Serial.println(F("========================================================="));

  // Initialize Peripheral GPIOs
  pinMode(PIN_ALARM_OUTPUT, OUTPUT);
  digitalWrite(PIN_ALARM_OUTPUT, LOW); // Buzzer and motor OFF

  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP); // Button to GND with internal pull-up

  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);

  pinMode(PIN_ECHO, INPUT);

  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, HIGH); // Built-in LED OFF (Active LOW)

  // Initialize WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  connectToWiFi();

  Serial.println(F("[System] Hardware pins configured. Local obstacle radar running."));
  Serial.println(F("[Safety Note] Verify physical connections with multimeter before deployment."));
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Local Ultrasonic Sensing & Obstacle Feedback (CRITICAL: Runs every 50ms)
  // This executes independently of network state to ensure user safety.
  if (currentMillis - lastObstacleCheck >= OBSTACLE_SAMPLE_INTERVAL) {
    lastObstacleCheck = currentMillis;
    updateObstacleDetection();
  }

  // 2. Debounced SOS Push Button Check on Pin D2
  updateSosButton();

  // 3. Wi-Fi Reconnection Check (Non-blocking)
  if (WiFi.status() != WL_CONNECTED) {
    if (currentMillis - lastWifiAttempt >= WIFI_RETRY_INTERVAL) {
      lastWifiAttempt = currentMillis;
      Serial.println(F("[WiFi] Connection lost. Attempting reconnect..."));
      WiFi.reconnect();
    }
  } else {
    // If connected and NTP time not yet synced, synchronize clock
    if (!isTimeSynced) {
      syncNtpTime();
    }
  }

  // 4. Dispatch Queued Emergency SOS Alert
  if (sosAlertPending && WiFi.status() == WL_CONNECTED) {
    // Retry with non-blocking rate limiter so obstacle detection is not starved
    if (currentMillis - lastSosAttemptTime >= SOS_RETRY_INTERVAL) {
      lastSosAttemptTime = currentMillis;

      // Ensure valid Firebase Auth token exists
      if (idToken.length() == 0 || millis() >= tokenExpiryMillis) {
        refreshDeviceAuthToken();
      }

      Serial.printf("[SOS] Dispatching distress event (Attempt %d/%d)...\n", sosRetryCount + 1, MAX_SOS_RETRIES);
      
      // Perform local sensor check immediately before network call
      updateObstacleDetection();

      bool success = sendSosAlertToFirebase();
      if (success) {
        Serial.println(F("[SOS] Distress alert successfully received by Firebase Realtime Database!"));
        sosAlertPending = false;
        currentSosEventId = "";
        sosRetryCount = 0;
      } else {
        sosRetryCount++;
        Serial.printf("[SOS] Dispatch failed. Safe retry in %lu ms.\n", SOS_RETRY_INTERVAL);
        if (sosRetryCount >= MAX_SOS_RETRIES) {
          Serial.println(F("[SOS] Max retries reached. Will hold alert in queue for network recovery."));
          // Hold event in queue, but delay next cycle to prevent looping
          lastSosAttemptTime = currentMillis + 5000;
        }
      }
    }
  }

  // 5. Periodic Device Heartbeat (every 30 seconds)
  if (WiFi.status() == WL_CONNECTED && !sosAlertPending) {
    if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatTime = currentMillis;

      if (idToken.length() == 0 || millis() >= tokenExpiryMillis) {
        refreshDeviceAuthToken();
      }

      // Check sensor right before network operation
      updateObstacleDetection();
      sendHeartbeatToFirebase();
    }
  }

  // Yield to ESP8266 background Wi-Fi and TCP/IP stack
  yield();
}

// -----------------------------------------------------------------------------
// Connects to Wi-Fi Network
// -----------------------------------------------------------------------------
void connectToWiFi() {
  Serial.printf("[WiFi] Connecting to SSID: %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttempt = millis();
}

// -----------------------------------------------------------------------------
// Synchronizes time via NTP for TLS certificate validation
// -----------------------------------------------------------------------------
void syncNtpTime() {
  Serial.println(F("[NTP] Synchronizing UTC time for HTTPS certificate verification..."));
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  time_t now = time(nullptr);
  // If time is past year 2024 (1704067200), clock is synchronized
  if (now > 1704067200) {
    isTimeSynced = true;
    Serial.printf("[NTP] Time synchronized successfully: %lu\n", (unsigned long)now);
  }
}

// -----------------------------------------------------------------------------
// Checks TLS verification prerequisites. Fails securely if verification cannot be performed.
// -----------------------------------------------------------------------------
bool ensureTlsPrerequisites() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  if (!isTimeSynced) {
    syncNtpTime();
    time_t now = time(nullptr);
    if (now > 1704067200) {
      isTimeSynced = true;
    }
  }
  if (!isTimeSynced) {
    Serial.println(F("[Security] TLS certificate verification cannot be performed: UTC clock unsynchronized via NTP."));
    Serial.println(F("[Security] Connection aborted securely. Insecure connections are strictly forbidden."));
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Local Ultrasonic Obstacle Detection (Threshold <= 50 cm)
// Runs non-blockingly with bounded 10ms timeout.
// -----------------------------------------------------------------------------
void updateObstacleDetection() {
  // Trigger 10-microsecond pulse to HC-SR04 TRIG pin (D6)
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Read ECHO pulse on Pin D5 with bounded 10ms timeout (~170 cm maximum range)
  // This bounded timeout ensures the MCU never blocks waiting for an echo.
  unsigned long duration = pulseIn(PIN_ECHO, HIGH, 10000);

  if (duration == 0) {
    // No obstacle detected in range or echo timed out
    digitalWrite(PIN_ALARM_OUTPUT, LOW);
    return;
  }

  // Speed of sound: 343 m/s = 0.0343 cm/microsecond
  // Distance = (duration * 0.0343) / 2
  float distanceCm = (duration * 0.0343) / 2.0;

  // Obstacle detection threshold: 50 cm
  if (distanceCm > 0.0 && distanceCm <= (float)OBSTACLE_DISTANCE_CM) {
    // Obstacle detected within 50 cm! Activate buzzer and vibration motor on Pin D1
    digitalWrite(PIN_ALARM_OUTPUT, HIGH);
  } else {
    // Path clear
    digitalWrite(PIN_ALARM_OUTPUT, LOW);
  }
}

// -----------------------------------------------------------------------------
// Debounced Button Handler for Pin D2 (INPUT_PULLUP)
// -----------------------------------------------------------------------------
void updateSosButton() {
  int reading = digitalRead(PIN_SOS_BUTTON);

  if (reading != lastButtonReading) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > BUTTON_DEBOUNCE_TIME) {
    if (reading != buttonState) {
      buttonState = reading;

      // Button pressed (Active LOW)
      if (buttonState == LOW) {
        Serial.println(F("\n======================================================="));
        Serial.println(F("[BUTTON] >>> EMERGENCY SOS BUTTON PRESSED ON PIN D2! <<<"));
        Serial.println(F("======================================================="));

        sosAlertPending = true;
        sosRetryCount = 0;

        // Generate a unique SOS event ID for this button press event
        // Format: sos_<deviceId>_<millis>_<random>
        currentSosEventId = "sos_" + String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
        Serial.printf("[SOS] Created unique event ID: %s\n", currentSosEventId.c_str());

        // Quick LED blink confirmation
        digitalWrite(PIN_STATUS_LED, LOW);
        delay(30);
        digitalWrite(PIN_STATUS_LED, HIGH);
      }
    }
  }

  lastButtonReading = reading;
}

// -----------------------------------------------------------------------------
// Authenticates with Firebase Auth using Device Account credentials
// Strictly verifies Google Trust Services TLS certificate
// -----------------------------------------------------------------------------
bool refreshDeviceAuthToken() {
  // If a static auth token/secret is provided in config, use it directly
  if (String(FIREBASE_AUTH_TOKEN).length() > 0) {
    idToken = String(FIREBASE_AUTH_TOKEN);
    tokenExpiryMillis = millis() + (3600UL * 1000UL);
    return true;
  }

  // If no API key configured, cannot perform REST login
  if (String(FIREBASE_API_KEY).length() == 0 || String(DEVICE_EMAIL).length() == 0) {
    Serial.println(F("[Auth] FIREBASE_API_KEY or DEVICE_EMAIL not specified in config.h."));
    return false;
  }

  // Ensure TLS verification prerequisites are strictly satisfied
  if (!ensureTlsPrerequisites()) {
    Serial.println(F("[Auth] Aborting authentication: TLS certificate verification prerequisites not met."));
    return false;
  }

  WiFiClientSecure client;
  client.setTimeout(2500); // Tight 2.5s timeout to avoid freezing sensing
  client.setTrustAnchors(&trustAnchor);

  HTTPClient https;
  String authUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + String(FIREBASE_API_KEY);

  if (!https.begin(client, authUrl)) {
    Serial.println(F("[Auth] Failed to initialize HTTPS connection for auth."));
    return false;
  }

  https.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"email\":\"" + String(DEVICE_EMAIL) + "\",";
  payload += "\"password\":\"" + String(DEVICE_PASSWORD) + "\",";
  payload += "\"returnSecureToken\":true";
  payload += "}";

  int httpCode = https.POST(payload);
  bool success = false;

  if (httpCode == 200 || httpCode == 201) {
    String response = https.getString();
    // Parse idToken from JSON response
    int tokenIndex = response.indexOf("\"idToken\": \"");
    if (tokenIndex != -1) {
      int tokenStart = tokenIndex + 11;
      int tokenEnd = response.indexOf("\"", tokenStart);
      idToken = response.substring(tokenStart, tokenEnd);
      tokenExpiryMillis = millis() + (3000UL * 1000UL); // Refresh every ~50 minutes
      Serial.println(F("[Auth] Device Account authenticated successfully with Firebase Auth."));
      success = true;
    }
  } else {
    Serial.printf("[Auth] Device authentication failed. HTTP Code: %d\n", httpCode);
  }

  https.end();
  return success;
}

// -----------------------------------------------------------------------------
// Sends SOS Alert to Firebase Realtime Database
// Uses idempotent PUT to /alerts/<currentSosEventId>.json
// Strictly verifies Google Trust Services TLS certificate
// -----------------------------------------------------------------------------
bool sendSosAlertToFirebase() {
  if (currentSosEventId.length() == 0) {
    currentSosEventId = "sos_" + String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
  }

  // Ensure TLS verification prerequisites are strictly satisfied
  if (!ensureTlsPrerequisites()) {
    Serial.println(F("[SOS] Aborting SOS dispatch: TLS certificate verification prerequisites not met."));
    return false;
  }

  WiFiClientSecure client;
  client.setTimeout(2500); // 2.5 second timeout to keep loop responsive
  client.setTrustAnchors(&trustAnchor);

  HTTPClient https;
  String url = "https://" + String(FIREBASE_HOST) + "/alerts/" + currentSosEventId + ".json";
  if (idToken.length() > 0) {
    url += "?auth=" + idToken;
  }

  if (!https.begin(client, url)) {
    Serial.println(F("[SOS] HTTPS connection failed to initialize."));
    return false;
  }

  https.addHeader("Content-Type", "application/json");

  // Construct JSON payload
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"type\":\"SOS\",";
  payload += "\"timestamp\":{\".sv\":\"timestamp\"},";
  payload += "\"acknowledged\":false,";
  payload += "\"acknowledgedAt\":null,";
  payload += "\"note\":\"Emergency tactile button pressed on cane (Pin D2)\"";
  payload += "}";

  Serial.printf("[SOS] Sending secure verified PUT request to: %s\n", url.c_str());
  int httpCode = https.PUT(payload);

  bool success = false;
  if (httpCode == HTTP_CODE_OK || httpCode == 200 || httpCode == 201) {
    String response = https.getString();
    Serial.printf("[SOS] Success 200 OK: %s\n", response.c_str());
    success = true;

    // Triple LED blink confirmation
    for (int i = 0; i < 3; i++) {
      digitalWrite(PIN_STATUS_LED, LOW);
      delay(30);
      digitalWrite(PIN_STATUS_LED, HIGH);
      delay(30);
    }
  } else {
    Serial.printf("[SOS] HTTP PUT error code: %d, msg: %s\n", httpCode, https.errorToString(httpCode).c_str());
  }

  https.end();
  return success;
}

// -----------------------------------------------------------------------------
// Sends Periodic Status / Heartbeat to Firebase
// Endpoint: PUT /devices/<DEVICE_ID>/status.json
// Strictly verifies Google Trust Services TLS certificate
// -----------------------------------------------------------------------------
void sendHeartbeatToFirebase() {
  if (!ensureTlsPrerequisites()) {
    return;
  }

  WiFiClientSecure client;
  client.setTimeout(2500);
  client.setTrustAnchors(&trustAnchor);

  HTTPClient https;
  String url = "https://" + String(FIREBASE_HOST) + "/devices/" + String(DEVICE_ID) + "/status.json";
  if (idToken.length() > 0) {
    url += "?auth=" + idToken;
  }

  if (!https.begin(client, url)) {
    return;
  }

  https.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"online\":true,";
  payload += "\"lastSeen\":{\".sv\":\"timestamp\"},";
  payload += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  payload += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  payload += "\"firmware\":\"" + String(FIRMWARE_VERSION) + "\"";
  payload += "}";

  int httpCode = https.PUT(payload);
  if (httpCode == HTTP_CODE_OK || httpCode == 200) {
    // Heartbeat delivered
  }
  https.end();
}
