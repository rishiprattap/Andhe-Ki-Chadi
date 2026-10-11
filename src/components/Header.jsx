import React from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Settings,
  User,
  Radio,
  Zap,
  LogOut,
  LogIn,
} from 'lucide-react';

export default function Header({
  isConfigured,
  isMuted,
  onToggleMute,
  onTestSound,
  notificationStatus,
  onRequestNotifications,
  onOpenSettings,
  onOpenSimulate,
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 text-red-500 shadow-lg shadow-red-500/10">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Andhe Ki Chadi
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 uppercase tracking-wider">
                  SOS Monitor
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xs:block">
                Smart IoT Cane for Visually Impaired Safety
              </p>
            </div>
          </div>

          {/* Mode Pill for small mobile screens */}
          <div className="sm:hidden">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live
              </span>
            ) : (
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30"
              >
                <Radio className="w-3 h-3 text-amber-400" />
                Demo
              </button>
            )}
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center flex-wrap justify-end gap-2 w-full sm:w-auto">
          {/* Cloud Connection Badge (Tablet & Desktop) */}
          <div className="hidden sm:flex items-center">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Firebase Live DB
              </span>
            ) : (
              <button
                onClick={onOpenSettings}
                title="Configure Firebase Realtime Database"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                Setup Firebase Keys
              </button>
            )}
          </div>

          {/* Simulate SOS Button (Quick Test) */}
          <button
            onClick={onOpenSimulate}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/50 shadow-sm transition-all"
            title="Simulate hardware trigger for instant testing"
          >
            <Zap className="w-3.5 h-3.5 text-red-400" />
            <span className="font-semibold hidden xs:inline">Simulate</span>
          </button>

          {/* Sound Controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-md transition-colors ${
                isMuted
                  ? 'text-red-400 hover:bg-slate-700/50'
                  : 'text-emerald-400 hover:bg-slate-700/50'
              }`}
              title={isMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onTestSound}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors hidden sm:inline"
              title="Test Emergency Audio Siren Beep"
            >
              Test Siren
            </button>
          </div>

          {/* Desktop Notification Toggle */}
          <button
            onClick={onRequestNotifications}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              notificationStatus === 'granted'
                ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                : 'bg-indigo-950/40 text-indigo-300 border-indigo-700/40 hover:bg-indigo-900/40'
            }`}
            title={
              notificationStatus === 'granted'
                ? 'Browser notifications enabled'
                : 'Click to enable desktop emergency alerts'
            }
          >
            {notificationStatus === 'granted' ? (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Alerts On</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Enable Alerts</span>
              </>
            )}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-colors"
            title="Firebase Configuration & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Auth Status & Login/Logout */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-700">
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700"
                title={`Logged in as ${currentUser.email || 'Admin'}`}
              >
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="max-w-[90px] sm:max-w-[130px] truncate font-medium text-[11px]">
                  {currentUser.email ? currentUser.email.split('@')[0] : 'Admin'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
