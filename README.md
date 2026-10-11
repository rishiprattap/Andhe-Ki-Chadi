# Andhe Ki Chadi (Smart Blind Stick Safety System)

**Andhe Ki Chadi** is an IoT assistive cane system designed for visually impaired safety. It integrates an ESP8266 WeMos D1 Mini microcontroller with ultrasonic obstacle radar and an emergency distress button, connected in real time to a web dashboard via Firebase Realtime Database.

---

> **Live dashboard:** [andhe-ki-chadi.web.app](https://andhe-ki-chadi.web.app) · **Project demonstration:** see [Demo Video](#project-demonstration) below.

## Project Demonstration

A hands-on demonstration video of the Andhe Ki Chadi smart walking stick and SOS monitoring system is available for this project. The video is pending publication to a shareable video hosting URL.

**To publish the demonstration:** upload `AndheKiChadi.mp4` to a GitHub Release (or another accessible video host), then replace the placeholder below with the video's public URL:

[**Watch the Andhe Ki Chadi project demo (video link to be added)**](https://github.com/rishiprattap/Andhe-Ki-Chadi/releases)

> Note: This repository currently has no published GitHub Releases. The video is **not yet uploaded** to GitHub; the link above opens the Releases page, not the video itself.

### Current Integration Status

- React monitoring dashboard is deployed to Firebase Hosting.
- ESP8266 heartbeat successfully reached Firebase Realtime Database under `/devices/device001/status` (observed HTTP 200 and stored status).
- End-to-end physical SOS delivery and dashboard online-status synchronization still require final verification before relying on the prototype.
- This is a prototype assistive device, not a substitute for proven mobility or emergency safeguards.

---

## 1. System Architecture

```text
               +-------------------------------------------+
               |        WeMos D1 Mini (ESP8266)             |
               +-------------------------------------------+
                 |             |             |            |
             [Pin D6]      [Pin D5]      [Pin D1]     [Pin D2]
              (TRIG)        (ECHO)       (Driver)    (INPUT_PULLUP)
                 |             |             |            |
                 v             v             v            v
           HC-SR04 Ultrasonic Sensor    Buzzer + Motor  Tactile SOS Button
           (Obstacle Detection <= 50cm)  (Local Alarm)  (Emergency Signal)
                                                          |
                                                          | HTTPS (Wi-Fi)
                                                          v
                                            +---------------------------+
                                            | Firebase Realtime Database|
                                            +---------------------------+
                                                          |
                                                          | WebSockets / SSL
                                                          v
                                            +---------------------------+
                                            | React Realtime Dashboard  |
                                            +---------------------------+
```

---

## 2. Hardware Wiring & Pin Mapping

| Component | Pin on Component | WeMos D1 Mini Pin | GPIO | Function |
|---|---|---|---|---|
| **HC-SR04 Ultrasonic** | TRIG | **D6** | GPIO 12 | 10µs ultrasonic trigger pulse |
| **HC-SR04 Ultrasonic** | ECHO | **D5** | GPIO 14 | Pulse echo reading (via 1kΩ / 2kΩ voltage divider) |
| **Driver Circuit** | Gate / Base | **D1** | GPIO 5 | Controls Buzzer & Vibration Motor together |
| **SOS Push Button** | Signal | **D2** | GPIO 4 | Emergency tactile switch to GND (`INPUT_PULLUP`) |
| **Onboard Indicator** | LED | **LED_BUILTIN** | GPIO 2 | Visual transmission feedback (Active LOW) |

### Key Safety Principles:
1. **Local Obstacle Detection (<= 50 cm):**
   - Continuously measures obstacle distance every 50ms without blocking.
   - When an object is within **50 cm**, Pin D1 immediately activates the buzzer and vibration motor locally.
   - **Zero network latency:** Obstacle detection operates 100% locally on-device and generates no Firebase traffic.
2. **Emergency SOS Distress Alerts (Pin D2):**
   - Only pressing the physical button on **D2** dispatches an emergency alert to Firebase.
   - Generates a unique SOS event ID per press (`sos_<deviceId>_<time>_<rand>`).
   - Idempotent `PUT` requests prevent duplicate alerts on network retries.
   - Non-blocking network timers ensure local obstacle sensing is never interrupted during cloud calls.

---

## 3. Web Dashboard Features

- **Real-Time SOS Emergency Banner:** Displays prominent red alert banner with elapsed time ticker when D2 is pressed.
- **Audible Emergency Siren:** Dual-tone alarm siren generated via Web Audio API (with autoplay unlocking and mute toggle).
- **Desktop Push Notifications:** Browser desktop notifications for emergency alerts with custom icon and vibration pattern.
- **Heartbeat & Telemetry Card:** Live status for device connectivity, RSSI signal strength, local IP, and heartbeat freshness.
- **Audit Log & History:** Searchable, filterable ledger of all incidents with one-click CSV export.
- **Supervisor Acknowledgement:** Authenticated administrators can acknowledge and resolve active distress signals.
- **Hardware Simulator:** Dev simulator for testing alerts and telemetry without physical hardware.

---

## 4. Role-Based Security in Firebase

The project enforces two roles via `database.rules.json`:

1. **ESP8266 Device Account:**
   - Can create SOS alerts **only** for its assigned device ID.
   - Can update its own online/offline heartbeat status.
   - Cannot read other users' data or view other alerts.
   - Cannot acknowledge or delete alerts.

2. **Administrator Account:**
   - Can securely log in via Firebase Authentication.
   - Can view live alerts and telemetry.
   - Can acknowledge and resolve emergency alerts.
   - Cannot impersonate hardware devices by creating arbitrary SOS alerts.

---

## 5. Getting Started

### 5.1 Clone & Install Dependencies
```bash
git clone https://github.com/rishiprattap/Andhe-Ki-Chadi.git
cd Andhe-Ki-Chadi
npm install
```

### 5.2 Configure Environment
```bash
cp .env.example .env
```
Fill in your Firebase project credentials in `.env`. Refer to [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for step-by-step instructions.

### 5.3 Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5.4 Build for Production
```bash
npm run build
```

---

## 6. Flashing the ESP8266 Firmware

1. Open `firmware/AndheKiChadi_ESP8266_SOS/AndheKiChadi_ESP8266_SOS.ino` in Arduino IDE.
2. Copy `config.h.example` to `config.h` in the same directory:
   ```bash
   cp firmware/AndheKiChadi_ESP8266_SOS/config.h.example firmware/AndheKiChadi_ESP8266_SOS/config.h
   ```
3. Enter your Wi-Fi SSID, Wi-Fi password, Firebase Database Host, and Device Account credentials.
4. Select Board: **LOLIN(WEMOS) D1 R2 & mini**.
5. Upload the sketch and open Serial Monitor at **115200 baud**.
6. Refer to [firmware/README.md](firmware/README.md) for full wiring schematics and voltage divider instructions.

---

## 7. Deployment to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting,database
```

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for complete deployment steps.
