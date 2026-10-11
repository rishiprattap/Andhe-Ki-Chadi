import React, { useState } from 'react';
import {
  X,
  Zap,
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Lock,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import {
  isFirebaseConfigured,
  sendLocalSimulatedSos,
  sendLocalSimulatedHeartbeat,
  sendSimulatedSosAsDevice,
  sendSimulatedHeartbeatAsDevice,
} from '../services/firebase';

export default function SimulatedDeviceModal({
  isOpen,
  onClose,
  currentDeviceOnline,
}) {
  const isCloudActive = isFirebaseConfigured();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deviceId, setDeviceId] = useState('device001');

  // Device account credentials for strict live Firebase simulation
  const [useLiveDeviceAuth, setUseLiveDeviceAuth] = useState(false);
  const [deviceEmail, setDeviceEmail] = useState('device001@andhekichadi.local');
  const [devicePassword, setDevicePassword] = useState('');

  if (!isOpen) return null;

  const handleSimulateSos = async () => {
    try {
      setLoading(true);
      setSuccessMsg('');
      setErrorMsg('');

      if (isCloudActive && useLiveDeviceAuth) {
        if (!devicePassword) {
          throw new Error('Please enter the ESP8266 Device Account password to test live database rules.');
        }
        const res = await sendSimulatedSosAsDevice({
          deviceEmail,
          devicePassword,
          deviceId,
          note: '[SIMULATED DRILL] Live Simulated SOS (Validated with ESP8266 Device Auth)',
        });
        setSuccessMsg(`⚠️ Live SOS Drill dispatched to Firebase as ${deviceId} (Key: ${res.id}, Tagged: isSimulated)!`);
      } else {
        const id = sendLocalSimulatedSos(deviceId, '[SIMULATED DRILL] Simulated D2 Button Press (Local Simulator)');
        setSuccessMsg(`⚠️ Simulated SOS drill dispatched! (Event ID: ${id}, Tagged: isSimulated)`);
      }
    } catch (err) {
      console.error('SOS simulation error:', err);
      setErrorMsg(`Simulation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHeartbeat = async (status) => {
    try {
      setLoading(true);
      setSuccessMsg('');
      setErrorMsg('');

      if (isCloudActive && useLiveDeviceAuth) {
        if (!devicePassword) {
          throw new Error('Please enter the ESP8266 Device Account password to test live device status rules.');
        }
        await sendSimulatedHeartbeatAsDevice({
          deviceEmail,
          devicePassword,
          deviceId,
          online: status,
        });
        setSuccessMsg(
          status
            ? `🟢 Live Firebase status updated: ${deviceId} marked ONLINE`
            : `⚪ Live Firebase status updated: ${deviceId} marked OFFLINE`
        );
      } else {
        sendLocalSimulatedHeartbeat(deviceId, status);
        setSuccessMsg(
          status
            ? `🟢 Simulated heartbeat: ${deviceId} marked ONLINE`
            : `⚪ Simulated disconnect: ${deviceId} marked OFFLINE`
        );
      }
    } catch (err) {
      console.error('Heartbeat simulation error:', err);
      setErrorMsg(`Heartbeat simulation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                ESP8266 Hardware Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Test emergency alerts and telemetry reaction without physical hardware
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error message banner */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="py-5 space-y-5">
          {/* Device ID target */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Target Device Identifier
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Security Rule Notice for Live Firebase */}
          {isCloudActive && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" />
                  Production Security Rules Notice
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLiveDeviceAuth}
                    onChange={(e) => setUseLiveDeviceAuth(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-[11px] text-slate-400">Authenticate as Device</span>
                </label>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {useLiveDeviceAuth
                  ? 'Simulating as the registered ESP8266 Device Account tests the exact database.rules.json permissions that the physical hardware will use.'
                  : 'By default, the simulator triggers the local dashboard state without bypassing production rules. Check "Authenticate as Device" to test live Firebase writes.'}
              </p>

              {useLiveDeviceAuth && (
                <div className="pt-2 space-y-2 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      ESP8266 Device Account Email:
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={deviceEmail}
                        onChange={(e) => setDeviceEmail(e.target.value)}
                        placeholder="device001@andhekichadi.local"
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Device Account Password:
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={devicePassword}
                        onChange={(e) => setDevicePassword(e.target.value)}
                        placeholder="Device password created in Firebase Auth"
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action 1: SOS Button Press */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Simulate SOS Push Button (Pin D2)</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DRILL SIMULATION
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Emulates pressing the tactile emergency button on Pin D2 of the cane. Dispatches an isolated drill distress alert tagged with <code className="text-amber-300">isSimulated: true</code>.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Safety Isolation:</strong> All events created here are clearly labeled as <code className="text-amber-300">[SIMULATED DRILL]</code> on the dashboard to ensure they are never confused with a genuine emergency.
              </span>
            </div>
            <button
              onClick={handleSimulateSos}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? 'DISPATCHING DRILL SOS...' : 'TRIGGER TEST DRILL SOS'}</span>
            </button>
          </div>

          {/* Action 2: Heartbeat Simulator */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>Simulate ESP8266 Heartbeat Connection</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span>devices/{deviceId}/status</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${currentDeviceOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  {currentDeviceOnline ? 'CURRENTLY ONLINE' : 'CURRENTLY OFFLINE'}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Update online/offline status in the database to test the live indicator.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleToggleHeartbeat(true)}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Set Device Online</span>
              </button>
              <button
                onClick={() => handleToggleHeartbeat(false)}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <WifiOff className="w-4 h-4 text-slate-400" />
                <span>Set Device Offline</span>
              </button>
            </div>
          </div>

          {/* Note on Ultrasonic Obstacle Sensor (<50 cm) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-300">HC-SR04 Obstacle Behavior:</strong> In the firmware, when obstacles are within <strong>50 cm</strong> (measured via D6 TRIG and D5 ECHO), Pin D1 activates the buzzer and vibration motor locally. No Firebase calls are made for obstacles, guaranteeing zero latency and battery conservation.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
