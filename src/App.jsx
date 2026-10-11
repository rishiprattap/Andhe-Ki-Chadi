import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import ActiveEmergencyBanner from './components/ActiveEmergencyBanner';
import DeviceStatusCard from './components/DeviceStatusCard';
import AlertHistoryTable from './components/AlertHistoryTable';
import SimulatedDeviceModal from './components/SimulatedDeviceModal';
import FirebaseConfigModal from './components/FirebaseConfigModal';
import AuthModal from './components/AuthModal';

import {
  initFirebase,
  isFirebaseConfigured,
  subscribeToAlerts,
  subscribeToDeviceStatus,
  acknowledgeAlert,
  subscribeToAuthState,
  signOutAdmin,
} from './services/firebase';

import { soundService } from './services/sound';
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  showEmergencyDesktopNotification,
} from './services/notifications';

export default function App() {
  const [configured, setConfigured] = useState(() => isFirebaseConfigured());
  const [alerts, setAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(null);

  const [device, setDevice] = useState({ online: false, lastSeen: 0, deviceId: 'device001' });
  const [currentUser, setCurrentUser] = useState(null);

  // Audio & Notification States
  const [isMuted, setIsMuted] = useState(soundService.isMuted);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(() =>
    getNotificationPermissionStatus()
  );

  // Modal dialog states
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Track alert IDs to prevent duplicate desktop alerts on Firebase reconnects
  const seenAlertIdsRef = useRef(new Set());
  const isInitialSnapshotRef = useRef(true);

  // Set up Firebase listeners
  const setupSubscriptions = useCallback(() => {
    // 1. Subscribe to Auth
    const unsubAuth = subscribeToAuthState((user) => {
      setCurrentUser(user);
    });

    // 2. Subscribe to Alerts
    const unsubAlerts = subscribeToAlerts(
      (alertsList) => {
        setIsAlertsLoading(false);
        setAlertsError(null);
        setAlerts(alertsList);

        const unacknowledged = alertsList.filter((a) => !a.acknowledged);

        if (isInitialSnapshotRef.current) {
          // Initial snapshot on page load
          alertsList.forEach((a) => seenAlertIdsRef.current.add(a.id));
          isInitialSnapshotRef.current = false;

          // If there are unacknowledged alerts on page refresh, sound siren & show banner
          if (unacknowledged.length > 0) {
            soundService.startSiren();
            setIsAudioBlocked(soundService.isAutoplayBlocked());
          }
        } else {
          // Subsequent snapshots: find truly newly arrived alerts
          const newlyArrivedAlert = unacknowledged.find(
            (a) => !seenAlertIdsRef.current.has(a.id)
          );

          if (unacknowledged.length > 0) {
            soundService.startSiren();
            setIsAudioBlocked(soundService.isAutoplayBlocked());

            if (newlyArrivedAlert) {
              seenAlertIdsRef.current.add(newlyArrivedAlert.id);
              showEmergencyDesktopNotification(newlyArrivedAlert);
            }
          } else {
            soundService.stopSiren();
            setIsAudioBlocked(false);
          }
        }
      },
      (err) => {
        setIsAlertsLoading(false);
        setAlertsError(err);
      }
    );

    // 3. Subscribe to primary device (device001)
    const unsubDevice = subscribeToDeviceStatus(
      'device001',
      (devData) => {
        setDevice(devData);
      },
      (err) => {
        console.warn('Device listener warning:', err);
      }
    );

    return () => {
      unsubAuth();
      if (typeof unsubAlerts === 'function') unsubAlerts();
      if (typeof unsubDevice === 'function') unsubDevice();
      soundService.stopSiren();
    };
  }, []);

  useEffect(() => {
    initFirebase();
    const unsub = setupSubscriptions();
    return unsub;
  }, [setupSubscriptions]);

  const handleToggleMute = () => {
    const newMuted = soundService.toggleMute();
    setIsMuted(newMuted);
    if (!newMuted) {
      setIsAudioBlocked(soundService.isAutoplayBlocked());
    }
  };

  const handleUnlockAudio = async () => {
    await soundService.unlockAudio();
    setIsAudioBlocked(soundService.isAutoplayBlocked());
  };

  const handleTestSound = async () => {
    await soundService.playTestBeep();
    setIsAudioBlocked(soundService.isAutoplayBlocked());
  };

  const handleRequestNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotificationStatus(res.status);
    if (res.granted) {
      showEmergencyDesktopNotification({
        deviceId: 'device001',
        timestamp: Date.now(),
        id: 'test-notification',
      });
    } else if (res.status === 'denied' && res.message) {
      alert(res.message);
    }
  };

  const handleAcknowledge = async (alertId) => {
    const userIdentifier = currentUser?.email || 'Supervisor';
    await acknowledgeAlert(alertId, userIdentifier);
    soundService.playSuccessChime();
  };

  const handleLogout = async () => {
    await signOutAdmin();
    setCurrentUser(null);
  };

  const handleConfigUpdated = () => {
    initFirebase();
    setConfigured(isFirebaseConfigured());
    setIsAlertsLoading(true);
    setAlertsError(null);
    isInitialSnapshotRef.current = true;
    seenAlertIdsRef.current.clear();
    setupSubscriptions();
  };

  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500/30 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <Header
        isConfigured={configured}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onTestSound={handleTestSound}
        notificationStatus={notificationStatus}
        onRequestNotifications={handleRequestNotifications}
        onOpenSettings={() => setIsConfigOpen(true)}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Dynamic Urgent Emergency Alert Banner */}
        <ActiveEmergencyBanner
          activeAlerts={activeAlerts}
          onAcknowledge={handleAcknowledge}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isAudioBlocked={isAudioBlocked}
          onUnlockAudio={handleUnlockAudio}
        />

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* WeMos D1 Mini Status Card (2 columns) */}
          <div className="lg:col-span-2">
            <DeviceStatusCard device={device} />
          </div>

          {/* Quick Stats & System Health Card (1 column) */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Monitoring Metrics
                </h3>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>

              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total SOS Incidents:</span>
                  <span className="text-base font-bold text-slate-200 font-mono">
                    {alerts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Active Unresolved:</span>
                  <span
                    className={`text-base font-bold font-mono ${
                      activeAlerts.length > 0 ? 'text-red-400 animate-pulse' : 'text-slate-200'
                    }`}
                  >
                    {activeAlerts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Resolution Rate:</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {alerts.length > 0
                      ? `${Math.round(
                          ((alerts.length - activeAlerts.length) / alerts.length) * 100
                        )}%`
                      : '100%'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Audio Alarm Status:</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {isMuted ? 'Muted' : isAudioBlocked ? 'Blocked by Browser' : 'Armed (Sound Enabled)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => setIsSimulateOpen(true)}
                className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Simulate Hardware SOS Trigger</span>
              </button>
              <button
                onClick={() => setIsConfigOpen(true)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition-colors"
              >
                Firebase Connection Settings
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Alert History Audit Log */}
        <AlertHistoryTable
          alerts={alerts}
          onAcknowledge={handleAcknowledge}
          currentUser={currentUser}
          isLoading={isAlertsLoading}
          error={alertsError}
          onRetry={setupSubscriptions}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          <strong>Andhe Ki Chadi</strong> &bull; Smart Safety Blind Stick System &bull; WeMos D1 Mini (ESP8266) &bull; Firebase Realtime Database
        </p>
      </footer>

      {/* Modals */}
      <SimulatedDeviceModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        currentDeviceOnline={Boolean(device?.online)}
      />

      <FirebaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigUpdated={handleConfigUpdated}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
