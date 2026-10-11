import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  get,
  update,
  onValue,
  serverTimestamp,
} from 'firebase/database';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const STORAGE_KEY = 'andhe_ki_chadi_firebase_config';

// Retrieve saved configuration or fallback to environment variables
export function getSavedConfig() {
  try {
    const custom = localStorage.getItem(STORAGE_KEY);
    if (custom) {
      return JSON.parse(custom);
    }
  } catch {
    // Ignore JSON parse errors
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

export function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Could not save config to localStorage', err);
  }
}

export function clearSavedConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

let app = null;
let db = null;
let auth = null;
let isDemoMode = false;

// Mock database for offline / demo testing when Firebase credentials are not yet configured
class MockDatabase {
  constructor() {
    this.alertsListeners = [];
    this.deviceListeners = {};
    this.alerts = [
      {
        id: 'mock-alert-1',
        deviceId: 'device001',
        type: 'SOS',
        timestamp: Date.now() - 1000 * 60 * 12,
        acknowledged: true,
        acknowledgedAt: Date.now() - 1000 * 60 * 11,
        acknowledgedBy: 'Admin (Safety Supervisor)',
        isSimulated: true,
        simulated: true,
        isDemo: true,
        note: '[SIMULATED DEMO] Resolved. Visually impaired user assisted safely (Demo Record).',
      },
    ];
    this.devices = {
      device001: {
        online: true,
        lastSeen: Date.now() - 8000,
        ip: '192.168.1.145',
        rssi: -58,
        firmware: 'v1.0.4-esp8266',
        hardware: 'WeMos D1 Mini + HC-SR04 (D6/D5) + D1 Motor/Buzzer',
        batteryPercent: 88,
      },
    };
  }

  notifyAlerts() {
    const list = [...this.alerts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    this.alertsListeners.forEach((cb) => cb(list));
  }

  notifyDevice(deviceId) {
    const dev = this.devices[deviceId] || { online: false, lastSeen: 0, deviceId };
    if (this.deviceListeners[deviceId]) {
      this.deviceListeners[deviceId].forEach((cb) => cb(dev));
    }
  }

  subscribeAlerts(cb) {
    this.alertsListeners.push(cb);
    this.notifyAlerts();
    return () => {
      this.alertsListeners = this.alertsListeners.filter((c) => c !== cb);
    };
  }

  subscribeDevice(deviceId, cb) {
    if (!this.deviceListeners[deviceId]) {
      this.deviceListeners[deviceId] = [];
    }
    this.deviceListeners[deviceId].push(cb);
    this.notifyDevice(deviceId);
    return () => {
      this.deviceListeners[deviceId] = this.deviceListeners[deviceId].filter((c) => c !== cb);
    };
  }

  addAlert(data) {
    const id = `mock-sos-${Date.now()}`;
    const newAlert = {
      id,
      deviceId: data.deviceId || 'device001',
      type: 'SOS',
      timestamp: Date.now(),
      acknowledged: false,
      acknowledgedAt: null,
      note: data.note || 'Emergency SOS button triggered on Pin D2',
      ...data,
    };
    this.alerts.unshift(newAlert);
    this.notifyAlerts();
    return id;
  }

  acknowledge(alertId, userEmail = 'Admin') {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      alert.acknowledgedBy = userEmail;
      this.notifyAlerts();
    }
  }

  updateDevice(deviceId, statusUpdate) {
    this.devices[deviceId] = {
      deviceId,
      ...(this.devices[deviceId] || {}),
      ...statusUpdate,
      lastSeen: statusUpdate.online ? Date.now() : (this.devices[deviceId]?.lastSeen || 0),
    };
    this.notifyDevice(deviceId);
  }
}

export const mockDb = new MockDatabase();

// Initialize or reinitialize Firebase
export function initFirebase() {
  const config = getSavedConfig();
  const hasConfig = Boolean(config.apiKey && config.databaseURL);

  if (!hasConfig) {
    isDemoMode = true;
    return { isConfigured: false, isDemoMode: true };
  }

  try {
    const defaultAppName = '[DEFAULT]';
    const existingApps = getApps();
    const defaultApp = existingApps.find((a) => a.name === defaultAppName);

    if (!defaultApp) {
      app = initializeApp(config);
    } else {
      app = defaultApp;
    }

    db = getDatabase(app);
    auth = getAuth(app);
    isDemoMode = false;
    return { isConfigured: true, isDemoMode: false, app, db, auth };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    isDemoMode = true;
    return { isConfigured: false, isDemoMode: true, error: err };
  }
}

export function isFirebaseConfigured() {
  const config = getSavedConfig();
  return Boolean(config.apiKey && config.databaseURL);
}

export function getDatabaseInstance() {
  if (!db) {
    initFirebase();
  }
  return db;
}

export function getAuthInstance() {
  if (!auth) {
    initFirebase();
  }
  return auth;
}

// Check if user is registered in the /admins roster or has admin claims
export async function checkAdminStatus(uid) {
  if (!uid || isDemoMode || !isFirebaseConfigured()) return true;

  try {
    const database = getDatabaseInstance();
    if (!database) return false;

    const adminRef = ref(database, `admins/${uid}`);
    const snapshot = await get(adminRef);
    return snapshot.exists();
  } catch (err) {
    console.warn('Error checking admin status:', err);
    return false;
  }
}

// Administrator accounts must be provisioned securely through Firebase Console
// or an authorized administrative process (e.g., Firebase Admin SDK / CLI).
// Client self-registration as administrator is strictly forbidden.

// Subscribe to SOS Alerts collection with proper cleanup
export function subscribeToAlerts(callback, onError) {
  if (!isFirebaseConfigured() || isDemoMode) {
    return mockDb.subscribeAlerts(callback);
  }

  const database = getDatabaseInstance();
  if (!database) {
    return () => {};
  }

  const alertsRef = ref(database, 'alerts');

  const unsubscribe = onValue(
    alertsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }

      // Convert object keys to array with id property
      const alertList = Object.entries(data).map(([id, val]) => {
        let ts = val.timestamp;
        if (typeof ts !== 'number' && ts && typeof ts === 'object') {
          ts = Date.now();
        }
        return {
          id,
          ...val,
          timestamp: typeof ts === 'number' ? ts : Date.now(),
        };
      });

      // Sort newest first
      alertList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      callback(alertList);
    },
    (err) => {
      console.error('Alerts listener error:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

// Subscribe to Device status (devices/{deviceId}/status)
export function subscribeToDeviceStatus(deviceId = 'device001', callback, onError) {
  if (!isFirebaseConfigured() || isDemoMode) {
    return mockDb.subscribeDevice(deviceId, callback);
  }

  const database = getDatabaseInstance();
  if (!database) return () => {};

  const statusRef = ref(database, `devices/${deviceId}/status`);

  const unsubscribe = onValue(
    statusRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback({
          deviceId,
          online: false,
          lastSeen: 0,
        });
        return;
      }

      let lastSeenVal = data.lastSeen;
      if (typeof lastSeenVal !== 'number' && lastSeenVal && typeof lastSeenVal === 'object') {
        lastSeenVal = Date.now();
      }

      callback({
        deviceId,
        ...data,
        lastSeen: typeof lastSeenVal === 'number' ? lastSeenVal : 0,
      });
    },
    (err) => {
      console.error(`Device ${deviceId} status listener error:`, err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

// Acknowledge an SOS alert (Admin action)
export async function acknowledgeAlert(alertId, userEmail = 'Admin') {
  if (!isFirebaseConfigured() || isDemoMode) {
    mockDb.acknowledge(alertId, userEmail);
    return { success: true };
  }

  const database = getDatabaseInstance();
  if (!database) throw new Error('Database not initialized');

  const alertRef = ref(database, `alerts/${alertId}`);
  await update(alertRef, {
    acknowledged: true,
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: userEmail,
  });

  return { success: true };
}

// Local simulation for dev & testing without hardware
export function sendLocalSimulatedSos(deviceId = 'device001', note = 'Tactile button press on D2 (Local Simulation)') {
  const formattedNote = note.includes('[SIMULATED') ? note : `[SIMULATED DRILL] ${note}`;
  return mockDb.addAlert({
    deviceId,
    note: formattedNote,
    simulated: true,
    isSimulated: true,
  });
}

// Local simulation for heartbeat
export function sendLocalSimulatedHeartbeat(deviceId = 'device001', isOnline = true) {
  mockDb.updateDevice(deviceId, {
    online: isOnline,
    lastSeen: isOnline ? Date.now() : 0,
    rssi: isOnline ? -62 : 0,
    ip: '192.168.1.145',
    firmware: 'v1.0.4-esp8266',
  });
}

// Dispatch SOS alert as an authenticated ESP8266 Device Account
// Note: Production database rules strictly enforce that ONLY a device account
// mapped in device_accounts/{uid} can create alerts. This helper authenticates
// as the device account to test production rules faithfully without bypassing them.
export async function sendSimulatedSosAsDevice({
  deviceEmail,
  devicePassword,
  deviceId = 'device001',
  note = 'Simulated Hardware Trigger (Pin D2)',
}) {
  const config = getSavedConfig();
  if (!config.apiKey || !config.databaseURL) {
    // If not configured, run locally
    const id = sendLocalSimulatedSos(deviceId, note);
    return { id, simulated: true, mode: 'local' };
  }

  // Use Firebase Auth REST endpoint to authenticate purely as the device
  // without disrupting the Administrator's active web session
  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`;
  const authRes = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: deviceEmail,
      password: devicePassword,
      returnSecureToken: true,
    }),
  });

  if (!authRes.ok) {
    const errorData = await authRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Device sign-in failed (HTTP ${authRes.status}). Verify device email & password.`
    );
  }

  const authData = await authRes.json();
  const deviceIdToken = authData.idToken;

  // Generate unique event ID (matches firmware's safe retry architecture)
  const eventId = `sos_${deviceId}_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;

  const formattedNote = note.includes('[SIMULATED') ? note : `[SIMULATED DRILL] ${note}`;

  // Send PUT to Realtime Database using device ID token
  const dbUrl = `${config.databaseURL.replace(/\/$/, '')}/alerts/${eventId}.json?auth=${deviceIdToken}`;
  const dbRes = await fetch(dbUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      type: 'SOS',
      timestamp: { '.sv': 'timestamp' },
      acknowledged: false,
      acknowledgedAt: null,
      isSimulated: true,
      note: formattedNote,
    }),
  });

  if (!dbRes.ok) {
    const dbErr = await dbRes.text().catch(() => '');
    throw new Error(`Realtime Database rejected device write: ${dbErr || dbRes.statusText}`);
  }

  return { id: eventId, success: true, mode: 'live_device_account' };
}

// Send device status update using Device Account credentials
export async function sendSimulatedHeartbeatAsDevice({
  deviceEmail,
  devicePassword,
  deviceId = 'device001',
  online = true,
}) {
  const config = getSavedConfig();
  if (!config.apiKey || !config.databaseURL) {
    sendLocalSimulatedHeartbeat(deviceId, online);
    return { success: true, mode: 'local' };
  }

  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`;
  const authRes = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: deviceEmail,
      password: devicePassword,
      returnSecureToken: true,
    }),
  });

  if (!authRes.ok) {
    const errorData = await authRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Device authentication failed: ${authRes.statusText}`
    );
  }

  const authData = await authRes.json();
  const deviceIdToken = authData.idToken;

  const dbUrl = `${config.databaseURL.replace(/\/$/, '')}/devices/${deviceId}/status.json?auth=${deviceIdToken}`;
  const dbRes = await fetch(dbUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      online,
      lastSeen: { '.sv': 'timestamp' },
      ip: '192.168.1.145',
      rssi: online ? -62 : 0,
      firmware: 'v1.0.4-esp8266',
    }),
  });

  if (!dbRes.ok) {
    const dbErr = await dbRes.text().catch(() => '');
    throw new Error(`Device status write rejected: ${dbErr || dbRes.statusText}`);
  }

  return { success: true, mode: 'live_device_account' };
}

// Authentication methods for Supervisor
export async function signInAdmin(email, password) {
  if (!isFirebaseConfigured() || isDemoMode) {
    const demoUser = {
      uid: 'demo-admin-id',
      email: email || 'admin@smartcane.org',
      displayName: 'Safety Supervisor',
      isDemo: true,
      isAdmin: true,
    };
    try {
      localStorage.setItem('demo_logged_in_user', JSON.stringify(demoUser));
    } catch {
      // Ignore
    }
    return demoUser;
  }

  const authentication = getAuthInstance();
  if (!authentication) throw new Error('Auth not initialized');

  const { user } = await signInWithEmailAndPassword(authentication, email, password);
  return user;
}

export async function signOutAdmin() {
  try {
    localStorage.removeItem('demo_logged_in_user');
  } catch {
    // Ignore
  }

  if (isFirebaseConfigured() && !isDemoMode) {
    const authentication = getAuthInstance();
    if (authentication) {
      await signOut(authentication);
    }
  }
}

export function subscribeToAuthState(callback) {
  if (!isFirebaseConfigured() || isDemoMode) {
    try {
      const demoUser = localStorage.getItem('demo_logged_in_user');
      if (demoUser) {
        callback(JSON.parse(demoUser));
        return () => {};
      }
    } catch {
      // Ignore
    }
    // Default authorized supervisor in demo mode
    const defaultUser = {
      uid: 'demo-admin-1',
      email: 'supervisor@smartcane.org',
      displayName: 'Emergency Supervisor (Demo)',
      isDemo: true,
      isAdmin: true,
    };
    callback(defaultUser);
    return () => {};
  }

  const authentication = getAuthInstance();
  if (!authentication) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(authentication, async (user) => {
    if (user) {
      const isAdmin = await checkAdminStatus(user.uid);
      callback({
        ...user,
        isAdmin,
      });
    } else {
      callback(null);
    }
  });
}
