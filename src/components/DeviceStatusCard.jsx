import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Cpu,
  Layers,
  Radio,
  Clock,
  Compass,
  AlertCircle,
  Vibrate,
  Activity,
} from 'lucide-react';

export default function DeviceStatusCard({ device = {} }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(timer);
  }, []);

  const lastSeenMs = typeof device.lastSeen === 'number' ? device.lastSeen : 0;
  const timeSinceLastHeartbeatSec = lastSeenMs > 0 ? Math.floor((now - lastSeenMs) / 1000) : 9999;

  // We consider device online if reported online AND last heartbeat is within 65 seconds
  const isOnline = Boolean(device.online && timeSinceLastHeartbeatSec < 65);

  const formatLastSeen = () => {
    if (lastSeenMs === 0) return 'Never connected';
    if (timeSinceLastHeartbeatSec < 5) return 'Just now (Live)';
    if (timeSinceLastHeartbeatSec < 60) return `${timeSinceLastHeartbeatSec}s ago`;
    const mins = Math.floor(timeSinceLastHeartbeatSec / 60);
    if (mins < 60) return `${mins}m ago`;
    return new Date(lastSeenMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRssiQuality = (rssi) => {
    if (!rssi) return { text: 'N/A', percent: 0, color: 'text-slate-500' };
    if (rssi >= -60) return { text: 'Excellent', percent: 95, color: 'text-emerald-400' };
    if (rssi >= -70) return { text: 'Good', percent: 75, color: 'text-emerald-500' };
    if (rssi >= -80) return { text: 'Fair', percent: 50, color: 'text-amber-400' };
    return { text: 'Weak', percent: 25, color: 'text-red-400' };
  };

  const rssiInfo = getRssiQuality(device.rssi);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl transition-all hover:border-slate-700/80">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>{device.deviceId || 'device001'}</span>
              <span className="text-xs font-normal text-slate-400">
                (WeMos D1 Mini ESP8266)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Andhe Ki Chadi - Smart Assistive Walking Stick
            </p>
          </div>
        </div>

        {/* Live Connectivity Badge */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ONLINE
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              {lastSeenMs > 0 ? 'OFFLINE (STALE)' : 'OFFLINE'}
            </span>
          )}
        </div>
      </div>

      {/* Grid of Device Parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-800/80 text-xs">
        {/* Heartbeat Status */}
        <div className="space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Last Heartbeat
          </span>
          <p className="text-sm font-semibold text-slate-200">
            {formatLastSeen()}
          </p>
        </div>

        {/* Wi-Fi RSSI */}
        <div className="space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className={`w-3.5 h-3.5 ${rssiInfo.color}`} />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-slate-500" />
            )}
            Wi-Fi Signal
          </span>
          <p className="text-sm font-semibold text-slate-200">
            {isOnline && device.rssi ? `${device.rssi} dBm (${rssiInfo.text})` : 'Disconnected'}
          </p>
        </div>

        {/* IP Address */}
        <div className="space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            Local IP
          </span>
          <p className="text-sm font-mono font-semibold text-slate-200">
            {device.ip || (isOnline ? '192.168.1.145' : '---')}
          </p>
        </div>

        {/* Firmware Version */}
        <div className="space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Firmware
          </span>
          <p className="text-sm font-mono font-semibold text-slate-200">
            {device.firmware || 'v1.0.4-esp8266'}
          </p>
        </div>
      </div>

      {/* Hardware Architecture & Pinout Map */}
      <div className="pt-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Hardware Sensor & Peripheral States
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* HC-SR04 Obstacle Sensor */}
          <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">HC-SR04 Ultrasonic</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                D6 (TRIG) / D5 (ECHO via divider)
              </p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Local Obstacle Radar (&le;50 cm)
              </span>
            </div>
          </div>

          {/* Buzzer & Motor Driver */}
          <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Vibrate className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">Buzzer & Vibration Motor</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                D1 (GPIO 5 via Transistor driver)
              </p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Local Tactile / Audio Warning
              </span>
            </div>
          </div>

          {/* SOS Emergency Push Button */}
          <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">Emergency Push Button</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                D2 (GPIO 4, INPUT_PULLUP)
              </p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-300 border border-red-500/30">
                Direct Cloud Firebase Distress
              </span>
            </div>
          </div>
        </div>

        {/* Local vs Cloud policy callout */}
        <div className="mt-3.5 p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 text-[11px] text-blue-300/90 leading-relaxed flex items-center gap-2">
          <Activity className="w-4 h-4 flex-shrink-0 text-blue-400" />
          <span>
            <strong>Isolated Architecture:</strong> Obstacle detection (<strong className="text-white">&le;50 cm</strong>) executes completely on-device to trigger D1 without generating cloud traffic. Only <strong className="text-white">D2 SOS button presses</strong> transmit urgent emergency distress alerts to Firebase and this dashboard.
          </span>
        </div>
      </div>
    </div>
  );
}
