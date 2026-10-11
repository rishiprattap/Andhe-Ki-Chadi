import React, { useState } from 'react';
import {
  X,
  Database,
  HelpCircle,
  Save,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import {
  getSavedConfig,
  saveConfig,
  clearSavedConfig,
} from '../services/firebase';

export default function FirebaseConfigModal({
  isOpen,
  onClose,
  onConfigUpdated,
}) {
  const current = getSavedConfig();
  const [apiKey, setApiKey] = useState(current.apiKey || '');
  const [authDomain, setAuthDomain] = useState(current.authDomain || '');
  const [databaseURL, setDatabaseURL] = useState(current.databaseURL || '');
  const [projectId, setProjectId] = useState(current.projectId || '');
  const [storageBucket, setStorageBucket] = useState(current.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(current.messagingSenderId || '');
  const [appId, setAppId] = useState(current.appId || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const newConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };
    saveConfig(newConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onConfigUpdated();
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    if (confirm('Clear custom Firebase configuration and use demo/environment mode?')) {
      clearSavedConfig();
      onConfigUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Firebase Project Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Connect your Firebase Realtime Database for live ESP8266 sync
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

        {savedSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Firebase configuration saved! Reconnecting services...</span>
          </div>
        )}

        {/* Instructions helper box */}
        <div className="mt-4 p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-200/90 space-y-1.5">
          <p className="font-semibold flex items-center gap-1.5 text-indigo-300">
            <HelpCircle className="w-4 h-4" />
            How to get these values from Firebase Console:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
            <li>Go to <strong>Firebase Console &gt; Project Settings &gt; General &gt; Your apps &gt; Web app</strong>.</li>
            <li>Copy the fields from <code>const firebaseConfig = &#123; ... &#125;;</code> into the form below.</li>
            <li>Ensure <strong>Realtime Database</strong> is created and copy the Database URL (e.g. <code>https://your-project-default-rtdb.firebaseio.com</code>).</li>
          </ol>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Database URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="https://your-project-default-rtdb.firebaseio.com"
              value={databaseURL}
              onChange={(e) => setDatabaseURL(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                API Key <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Project ID
              </label>
              <input
                type="text"
                placeholder="your-project-id"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Auth Domain
              </label>
              <input
                type="text"
                placeholder="your-project.firebaseapp.com"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                App ID
              </label>
              <input
                type="text"
                placeholder="1:123456789:web:abcdef"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Messaging Sender ID
              </label>
              <input
                type="text"
                placeholder="123456789012"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Storage Bucket
              </label>
              <input
                type="text"
                placeholder="your-project.appspot.com"
                value={storageBucket}
                onChange={(e) => setStorageBucket(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Config</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
