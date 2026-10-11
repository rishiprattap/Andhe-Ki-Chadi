# Andhe Ki Chadi (Smart Cane) - ESP8266 Hardware Guide

This directory contains the production firmware for the **WeMos D1 Mini (ESP8266)** microcontroller used in the Smart Assistive Cane for visually impaired individuals.

---

## 1. Hardware Pinout & Wiring Table

| Component | Pin on Component | Pin on WeMos D1 Mini | GPIO | Connection Note |
|---|---|---|---|---|
| **HC-SR04 Ultrasonic** | VCC | 5V (or VBUS) | - | Sensor requires 5V power supply |
| **HC-SR04 Ultrasonic** | GND | GND | - | Common system ground |
| **HC-SR04 Ultrasonic** | TRIG | **D6** | GPIO 12 | Trigger pulse from ESP8266 |
| **HC-SR04 Ultrasonic** | ECHO | **D5** | GPIO 14 | Connect through **1kΩ / 2kΩ voltage divider** (reduces 5V to 3.3V) |
| **Driver Circuit** | Gate / Base | **D1** | GPIO 5 | Controls Buzzer & Vibration Motor together |
| **Buzzer + Motor** | (+) Positive | 5V or 3.3V | - | Switched through NPN transistor (2N2222) or N-channel MOSFET |
| **Buzzer + Motor** | (-) Negative | Collector/Drain | - | Ground path completed by transistor driver |
| **SOS Push Button** | Terminal 1 | **D2** | GPIO 4 | Configured with internal `INPUT_PULLUP` |
| **SOS Push Button** | Terminal 2 | GND | - | Pressing shorts D2 to GND (Active LOW) |

> **Safety Reminder:** Do not assume the hardware is working until it has been physically tested with a multimeter and serial monitor.

---

## 2. Voltage Divider for HC-SR04 ECHO Pin (Pin D5)

The HC-SR04 ECHO pin outputs 5V TTL logic, while the ESP8266 inputs are rated for 3.3V. To protect the **D5** pin:
```text
HC-SR04 ECHO (5V)
       |
     [1kΩ]
       |
       +-----> WeMos D1 Mini Pin D5 (3.3V safe)
       |
     [2kΩ]
       |
      GND
```

---

## 3. Buzzer & Vibration Motor Driver (Pin D1)

A WeMos D1 Mini GPIO pin can only safely supply ~12mA. A vibration motor and active buzzer together draw 60mA–150mA. Use a 2N2222 NPN transistor or 2N7000/AO3400 MOSFET:
```text
             +5V
              |
      +-------+-------+
      |               |
   [Buzzer]    [Vibration Motor]
      |               |
      +-------+-------+
              |
          Collector (C)
              |
Pin D1 ---[1kΩ]--- Base (B) (2N2222)
              |
          Emitter (E)
              |
             GND
```
*Note: Include a 1N4001 flyback diode in reverse parallel across inductive motor terminals to suppress back-EMF spikes.*

---

## 4. Operational Behavior & Thresholds

1. **Obstacle Detection (<= 50 cm Threshold):**
   - HC-SR04 continuously measures obstacle distance every 50ms.
   - When an object is detected within **50 cm**, Pin D1 immediately activates the buzzer and vibration motor locally.
   - **Zero cloud latency:** This runs 100% on-device. No network requests are made for obstacles, guaranteeing uninterrupted user safety.
2. **Emergency SOS Distress Alerts (Pin D2):**
   - Pressing the tactile button on **D2** triggers an emergency SOS event.
   - A unique event ID is generated for each button press.
   - Dispatched via HTTPS PUT to Firebase Realtime Database at `/alerts/<eventId>.json`.
   - Idempotent retries prevent duplicate alerts if network connection drops.
   - Does **not** block local ultrasonic sensing during network retries.
3. **Heartbeat Telemetry:**
   - Sends online status, RSSI, and IP address to `/devices/<deviceId>/status.json` every 30 seconds.

---

## 5. Arduino IDE Setup Instructions

1. Open **Arduino IDE**.
2. Go to **File > Preferences**.
3. In **Additional Board Manager URLs**, add:
   ```text
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
4. Go to **Tools > Board > Boards Manager...**, search for `esp8266` and install the package.
5. Select Board: **LOLIN(WEMOS) D1 R2 & mini**.
6. Set CPU Frequency: **80 MHz** or **160 MHz**.
7. Set Flash Size: **4MB (FS:2MB OTA:~1019KB)**.
8. Set Upload Speed: **115200** or **921600**.

---

## 6. Configuring Secrets

1. Copy `config.h.example` to `config.h` in `firmware/AndheKiChadi_ESP8266_SOS/`:
   ```bash
   cp config.h.example config.h
   ```
2. Fill in your Wi-Fi credentials and Firebase settings:
   ```cpp
   #define WIFI_SSID           "MyHomeWifi"
   #define WIFI_PASSWORD       "SecretPassword123"
   #define FIREBASE_HOST       "your-project-id-default-rtdb.firebaseio.com"
   #define FIREBASE_API_KEY    "AIzaSyYourWebApiKeyHere"
   #define DEVICE_EMAIL        "device001@andhekichadi.local"
   #define DEVICE_PASSWORD     "DevicePassword123"
   #define DEVICE_ID           "device001"
   #define OBSTACLE_DISTANCE_CM 50
   ```
3. Verify and Upload to your WeMos D1 Mini.
4. Open the Serial Monitor at **115200 baud** to view real-time connection status and diagnostics.
