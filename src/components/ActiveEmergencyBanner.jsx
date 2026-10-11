import React, { useState, useEffect } from 'react';
import {
  Clock,
  Cpu,
  CheckCircle2,
  Volume2,
  VolumeX,
  ShieldAlert,
  AlertOctagon,
} from 'lucide-react';

export default function ActiveEmergencyBanner({
  activeAlerts = [],
  onAcknowledge,
  isMuted,
  onToggleMute,
  isAudioBlocked = false,
  onUnlockAudio,
}) {
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [ackError, setAckError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // Update relative elapsed time ticker every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!activeAlerts || activeAlerts.length === 0) {
    return null;
  }

  const primaryAlert = activeAlerts[0];
  const isSimulated = Boolean(
    primaryAlert.isSimulated ||
    primaryAlert.simulated ||
    (primaryAlert.id && primaryAlert.id.startsWith('mock-')) ||
    (primaryAlert.note && (
      primaryAlert.note.includes('SIMULAT') ||
      primaryAlert.note.includes('Simulated') ||
      primaryAlert.note.includes('Local Simulation') ||
      primaryAlert.note.includes('DRILL')
    ))
  );

  const alertTime = primaryAlert.timestamp || now;
  const elapsedMs = Math.max(0, now - alertTime);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedMin = Math.floor(elapsedSec / 60);

  const formatElapsedTime = () => {
    if (elapsedSec < 60) {
      return `${elapsedSec}s ago`;
    }
    return `${elapsedMin}m ${elapsedSec % 60}s ago`;
  };

  const handleAcknowledge = async (alertId) => {
    try {
      setAckError('');
      setAcknowledgingId(alertId);
      await onAcknowledge(alertId);
    } catch (err) {
      console.error('Acknowledgement failed:', err);
      setAckError(err.message || 'Failed to acknowledge alert. Admin login may be required.');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 shadow-2xl transition-all ${
        isSimulated
          ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-indigo-950 border-amber-500 shadow-amber-950/40'
          : 'bg-gradient-to-br from-red-950 via-red-900/95 to-slate-900 border-red-500 shadow-red-900/50 animate-emergency'
      }`}
    >
      {/* Dynamic Strobe Beacon Background Accents */}
      <div
        className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isSimulated ? 'bg-amber-600/10' : 'bg-red-600/20 animate-beacon'
        }`}
      ></div>
      <div
        className={`absolute -left-20 -bottom-20 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isSimulated ? 'bg-indigo-700/10' : 'bg-red-700/20 animate-beacon'
        }`}
      ></div>

      <div className="relative p-6 sm:p-8">
        {/* Autoplay blocked notice if browser prevented audio */}
        {isAudioBlocked && !isMuted && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-amber-400" />
              Browser blocked automatic sound playback. Click below to unblock the emergency audio siren.
            </span>
            <button
              onClick={onUnlockAudio}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-colors flex-shrink-0"
            >
              Enable Siren Audio
            </button>
          </div>
        )}

        {/* Error notification if acknowledgement failed */}
        {ackError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950 border border-red-700 text-red-200 text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{ackError}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Emergency Alert Header & Info */}
          <div className="flex items-start gap-5">
            <div
              className={`relative flex-shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl text-white shadow-xl ${
                isSimulated
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/30'
                  : 'bg-red-600 text-white shadow-red-600/50 animate-bounce'
              }`}
            >
              <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-90 ${
                    isSimulated ? 'bg-amber-300' : 'bg-white'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-4 w-4 ${
                    isSimulated ? 'bg-amber-400' : 'bg-white'
                  }`}
                ></span>
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {isSimulated ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-amber-400 text-slate-950 shadow-sm">
                    ⚠️ SIMULATED DRILL / TEST ALERT (NOT A REAL EMERGENCY)
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-white text-red-700 shadow-sm animate-pulse">
                    🚨 CRITICAL REAL EMERGENCY DISTRESS SIGNAL
                  </span>
                )}
                {activeAlerts.length > 1 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                    +{activeAlerts.length - 1} more pending
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs font-medium text-slate-300">
                  <Clock className="w-3.5 h-3.5" />
                  {formatElapsedTime()}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isSimulated ? '[SIMULATION / DRILL] Test Hardware SOS Alert' : 'SOS Emergency Button Activated!'}
              </h2>

              <p className="text-sm text-slate-200/90 max-w-2xl leading-relaxed">
                {isSimulated ? (
                  <>
                    This distress signal was dispatched in <strong>simulation/drill mode</strong> for device{' '}
                    <strong className="text-white underline decoration-amber-400">
                      {primaryAlert.deviceId || 'device001'}
                    </strong>
                    . It is strictly isolated from live hardware operations and <strong>does NOT indicate an actual emergency</strong>.
                  </>
                ) : (
                  <>
                    Emergency push button on <strong className="text-white underline decoration-red-400">Pin D2</strong> of Smart Cane was pressed.
                    The visually impaired user requires urgent immediate assistance.
                  </>
                )}
              </p>

              {/* Hardware & Timestamp metadata pills */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Device: <strong className="text-white">{primaryAlert.deviceId || 'device001'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Triggered at:{' '}
                    <strong className="text-white">
                      {new Date(alertTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </strong>
                  </span>
                </div>
                {primaryAlert.note && (
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700">
                    <span>Note: {primaryAlert.note}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Siren audio quick toggle */}
            <button
              onClick={onToggleMute}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                isMuted
                  ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-red-800/80 hover:bg-red-800 border-red-600 text-white'
              }`}
              title={isMuted ? 'Turn alarm sound on' : 'Silence alarm sound'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-5 h-5 text-red-400" />
                  <span>Alarm Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span>Silence Siren</span>
                </>
              )}
            </button>

            {/* Acknowledge SOS Alert Button */}
            <button
              onClick={() => handleAcknowledge(primaryAlert.id)}
              disabled={acknowledgingId === primaryAlert.id}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-emerald-950/40 border border-emerald-400/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>
                {acknowledgingId === primaryAlert.id
                  ? 'Saving...'
                  : isSimulated
                    ? 'RESOLVE DRILL ALERT'
                    : 'ACKNOWLEDGE & RESOLVE'}
              </span>
            </button>
          </div>
        </div>

        {/* Multi-alert list if more than 1 are active */}
        {activeAlerts.length > 1 && (
          <div className="mt-5 pt-4 border-t border-red-800/80">
            <p className="text-xs font-semibold text-red-300 uppercase tracking-wider mb-2">
              Other Pending Emergencies ({activeAlerts.length - 1}):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activeAlerts.slice(1).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-red-950/70 border border-red-800/60 text-xs"
                >
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span className="font-semibold">{alert.deviceId || 'device001'}</span>
                    <span className="text-red-300">
                      {new Date(alert.timestamp || now).toLocaleTimeString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={acknowledgingId === alert.id}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors disabled:opacity-50"
                  >
                    {acknowledgingId === alert.id ? 'Saving...' : 'Acknowledge'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
