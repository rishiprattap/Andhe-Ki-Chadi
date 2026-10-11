# Firebase Setup Guide for Andhe Ki Chadi

This guide walks you through setting up your existing Firebase project for the **Andhe Ki Chadi** smart cane system.

---

## 1. Prerequisites

- A Google / Firebase Account
- An existing Firebase Project in [Firebase Console](https://console.firebase.google.com/)
- Node.js (v18+) and npm installed on your machine

---

## 2. Step-by-Step Firebase Console Configuration

### Step 2.1: Register a Web App

1. In the [Firebase Console](https://console.firebase.google.com/), select your project.
2. In the Project Overview page, click the **Web icon (`</>`)** to add a web app.
3. App nickname: `Andhe Ki Chadi Web Monitor`.
4. Check **Also set up Firebase Hosting for this app**.
5. Click **Register app**.
6. You will see your `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project-id.firebaseapp.com",
     databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef..."
   };
   ```
7. Copy these values into a new `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   Fill in the corresponding `VITE_FIREBASE_*` variables.

---

### Step 2.2: Enable Firebase Authentication

1. In the Firebase Console left sidebar, click **Build > Authentication**.
2. Click **Get Started** if not already enabled.
3. In the **Sign-in method** tab:
   - Click **Email/Password**.
   - Toggle **Enable** to ON (leave Email link / passwordless OFF).
   - Click **Save**.

---

### Step 2.3: Create User Accounts (Two Roles)

The system requires two distinct user accounts in Firebase Authentication:

#### Account 1: Administrator Account (Safety Supervisor)
1. Go to **Authentication > Users** tab.
2. Click **Add user**.
3. Enter:
   - **Email:** `admin@smartcane.org` (or your personal admin email)
   - **Password:** A strong supervisor password
4. Click **Add user**.
5. Note the generated **User UID** for this admin account.

#### Account 2: ESP8266 Device Account
1. Click **Add user** again.
2. Enter:
   - **Email:** `device001@andhekichadi.local`
   - **Password:** A dedicated password for the device
3. Click **Add user**.
4. Note the generated **User UID** for this device account.

---

### Step 2.4: Enable Realtime Database

1. In the left sidebar, click **Build > Realtime Database**.
2. Click **Create Database**.
3. Choose a database location (e.g., `us-central1` or nearest region) and click **Next**.
4. Select **Start in locked mode** and click **Enable**.
5. Note your Database URL (e.g., `https://your-project-id-default-rtdb.firebaseio.com`). Make sure this URL matches `VITE_FIREBASE_DATABASE_URL` in `.env` and `FIREBASE_HOST` in `config.h`.

---

### Step 2.5: Apply Realtime Database Security Rules

1. In the Realtime Database page, go to the **Rules** tab.
2. Replace all existing contents with the rules from [`database.rules.json`](database.rules.json):

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "admins": {
      ".read": "auth != null && (root.child('admins').child(auth.uid).exists() || auth.token.admin === true)",
      "$adminUid": {
        ".read": "auth != null && (auth.uid === $adminUid || root.child('admins').child(auth.uid).exists() || auth.token.admin === true)",
        ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || auth.token.admin === true)"
      }
    },
    "device_accounts": {
      ".read": "auth != null && (root.child('admins').child(auth.uid).exists() || auth.token.admin === true)",
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || auth.token.admin === true)"
      }
    },
    "devices": {
      ".read": "auth != null && (root.child('admins').child(auth.uid).exists() || auth.token.admin === true)",
      "$deviceId": {
        ".read": "auth != null && (root.child('device_accounts').child(auth.uid).val() === $deviceId || root.child('admins').child(auth.uid).exists() || auth.token.admin === true)",
        "status": {
          ".write": "auth != null && root.child('device_accounts').child(auth.uid).val() === $deviceId && !root.child('admins').child(auth.uid).exists()",
          ".validate": "newData.hasChildren(['online'])"
        }
      }
    },
    "alerts": {
      ".read": "auth != null && (root.child('admins').child(auth.uid).exists() || auth.token.admin === true)",
      ".indexOn": ["timestamp", "acknowledged", "deviceId"],
      "$alertId": {
        ".write": "auth != null && ((!data.exists() && root.child('device_accounts').child(auth.uid).val() === newData.child('deviceId').val() && !root.child('admins').child(auth.uid).exists() && newData.hasChildren(['deviceId', 'type', 'timestamp', 'acknowledged']) && newData.child('type').val() === 'SOS' && newData.child('acknowledged').val() === false && (!newData.child('acknowledgedAt').exists() || newData.child('acknowledgedAt').val() === null)) || (data.exists() && (root.child('admins').child(auth.uid).exists() || auth.token.admin === true) && newData.child('acknowledged').val() === true && newData.child('acknowledgedAt').exists() && newData.child('deviceId').val() === data.child('deviceId').val() && newData.child('type').val() === data.child('type').val() && newData.child('timestamp').val() === data.child('timestamp').val()))"
      }
    }
  }
}
```
3. Click **Publish**.

---

### Step 2.6: Initialize Role Records in the Database

1. In Realtime Database, go to the **Data** tab.
2. Hover over the root node and click the **`+`** icon to add the following child nodes:

#### A. Register Administrator:
- Node name: `admins`
- Child key: `<YOUR_ADMIN_AUTH_UID>`
- Child value: `true` (or `{"role": "admin", "email": "admin@smartcane.org"}`)

> **Security Note:** In production, administrator UIDs must ALWAYS be provisioned securely through the Firebase Console or via an authorized administrative script using the Firebase Admin SDK. Client self-registration as administrator is strictly disallowed by security rules.

#### B. Register Device Account:
- Node name: `device_accounts`
- Child key: `<YOUR_DEVICE_AUTH_UID>`
- Child value: `"device001"`

---

## 3. Deploying via Firebase CLI

### Step 3.1: Install Firebase CLI & Log In
```bash
npm install -g firebase-tools
firebase login
```

### Step 3.2: Associate Your Project
Check `.firebaserc` and set your Project ID:
```bash
firebase use <your-firebase-project-id>
```

### Step 3.3: Deploy Database Rules
```bash
firebase deploy --only database
```

### Step 3.4: Build and Deploy the Web Dashboard
```bash
npm run build
firebase deploy --only hosting
```
The command output will display your live hosting URL:
`https://<your-project-id>.web.app`

---

## 4. Verification Checklist

1. **Administrator Login:**
   - Open your hosted website.
   - Click **Admin Login** in the top navigation.
   - Sign in using `admin@smartcane.org`.
   - Verify that the login badge shows your email name.

2. **Simulated Hardware Test:**
   - Click **Simulate Hardware**.
   - Press **PRESS SOS BUTTON NOW**.
   - Verify that:
     - Prominent red SOS banner appears immediately.
     - Siren sound plays (or shows "Click to Enable Siren" if browser autoplay blocked audio).
     - Incident appears in the Emergency Alert Audit Log.
     - Clicking **ACKNOWLEDGE & RESOLVE** marks the alert resolved.

3. **ESP8266 Live Test:**
   - Flash the firmware onto the WeMos D1 Mini with `config.h` configured.
   - Open Serial Monitor at `115200` baud.
   - Confirm Wi-Fi connection and NTP time sync.
   - Press the physical tactile button on **D2**.
   - Confirm the live website displays the distress banner within milliseconds from anywhere in the world!
