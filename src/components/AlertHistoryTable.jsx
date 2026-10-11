import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  Search,
  Download,
  Clock,
  UserCheck,
  ShieldCheck,
  AlertOctagon,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function AlertHistoryTable({
  alerts = [],
  onAcknowledge,
  currentUser,
  isLoading = false,
  error = null,
  onRetry,
}) {
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'resolved'
  const [search, setSearch] = useState('');
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const isAlertSimulated = (alert) =>
    Boolean(
      alert.isSimulated ||
      alert.simulated ||
      (alert.id && alert.id.startsWith('mock-')) ||
      (alert.note && (
        alert.note.includes('SIMULAT') ||
        alert.note.includes('Simulated') ||
        alert.note.includes('Local Simulation') ||
        alert.note.includes('DRILL')
      ))
    );

  const filteredAlerts = alerts.filter((alert) => {
    const isSim = isAlertSimulated(alert);

    // Category / status filter
    if (filter === 'pending' && alert.acknowledged) return false;
    if (filter === 'resolved' && !alert.acknowledged) return false;
    if (filter === 'real' && isSim) return false;
    if (filter === 'simulated' && !isSim) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDevice = (alert.deviceId || '').toLowerCase().includes(q);
      const matchId = (alert.id || '').toLowerCase().includes(q);
      const matchNote = (alert.note || '').toLowerCase().includes(q);
      return matchDevice || matchId || matchNote;
    }

    return true;
  });

  const handleAcknowledge = async (alertId) => {
    try {
      setActionError('');
      setAcknowledgingId(alertId);
      await onAcknowledge(alertId);
    } catch (err) {
      console.error('Failed to acknowledge alert from table:', err);
      setActionError(err.message || 'Permission denied. Only authenticated administrators can acknowledge alerts.');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const exportCsv = () => {
    if (!alerts.length) return;

    const headers = [
      'Alert ID',
      'Category',
      'Device ID',
      'Type',
      'Triggered Timestamp',
      'Date Time',
      'Status',
      'Acknowledged At',
      'Acknowledged By',
      'Note',
    ];
    const rows = alerts.map((a) => {
      const isSim = isAlertSimulated(a);
      return [
        a.id,
        isSim ? 'Simulated Drill / Demo' : 'Real Emergency',
        a.deviceId || 'device001',
        a.type || 'SOS',
        a.timestamp || '',
        a.timestamp ? new Date(a.timestamp).toISOString() : '',
        a.acknowledged ? 'Resolved' : isSim ? 'Active Drill' : 'Active Real SOS',
        a.acknowledgedAt ? new Date(a.acknowledgedAt).toISOString() : '',
        a.acknowledgedBy || '',
        `"${(a.note || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `andhe_ki_chadi_sos_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const realCount = alerts.filter((a) => !isAlertSimulated(a)).length;
  const simCount = alerts.filter((a) => isAlertSimulated(a)).length;
  const pendingCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Header with Title & Export */}
      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Emergency Alert Audit Log
              </h3>
              <p className="text-xs text-slate-400">
                Full chronological ledger of distress signals with strict real-vs-simulation isolation
              </p>
            </div>
          </div>
        </div>

        {/* Filter Badges & Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/80 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('real')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'real'
                  ? 'bg-red-900/80 text-red-200 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Only real emergency distress signals from physical canes"
            >
              Real Alerts ({realCount})
            </button>
            <button
              onClick={() => setFilter('simulated')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'simulated'
                  ? 'bg-amber-900/80 text-amber-200 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Simulated test and drill events"
            >
              Drill / Demo ({simCount})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-red-800/80 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'resolved'
                  ? 'bg-emerald-900/70 text-emerald-200 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resolved ({alerts.filter((a) => a.acknowledged).length})
            </button>
          </div>

          <button
            onClick={exportCsv}
            disabled={!alerts.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-40"
            title="Export CSV audit file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Error alert banner */}
      {actionError && (
        <div className="px-6 py-3 bg-red-950/70 border-b border-red-800 text-red-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError('')}
            className="text-red-400 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="px-6 py-3.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by device ID (device001), alert key, or notes..."
          className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">
            Syncing Emergency Records with Firebase...
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Establishing real-time connection to alert stream and device telemetry.
          </p>
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h4 className="text-base font-semibold text-red-300">
            Unable to Load Alert History
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {error.message || 'Check database security rules and verify your administrator credentials.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700"
            >
              Retry Connection
            </button>
          )}
        </div>
      ) : filteredAlerts.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-300">
            No Emergency Alerts Found
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {search
              ? 'No records match your query. Try searching for a different device or keyword.'
              : 'All emergency distress signals have been addressed or no incidents have been triggered.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Device ID</th>
                  <th className="py-3.5 px-6">Date & Time Triggered</th>
                  <th className="py-3.5 px-6">Resolution / Handled By</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {filteredAlerts.map((alert) => {
                  const dateObj = alert.timestamp ? new Date(alert.timestamp) : null;
                  const ackDateObj = alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : null;
                  const isSim = isAlertSimulated(alert);

                  return (
                    <tr
                      key={alert.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        !alert.acknowledged
                          ? isSim
                            ? 'bg-amber-950/20'
                            : 'bg-red-950/30'
                          : ''
                      }`}
                    >
                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {!alert.acknowledged ? (
                          isSim ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              SIMULATED DRILL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-red-400"></span>
                              ACTIVE SOS (REAL)
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {isSim ? 'Drill Resolved' : 'Resolved'}
                          </span>
                        )}
                      </td>

                      {/* Device */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200 font-mono">
                              {alert.deviceId || 'device001'}
                            </span>
                            {isSim ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                SIMULATION
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                                LIVE CANE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {alert.id.slice(0, 16)}...
                          </span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">
                            {dateObj
                              ? dateObj.toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Unknown Date'}
                          </span>
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {dateObj
                              ? dateObj.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : '---'}
                          </span>
                        </div>
                      </td>

                      {/* Resolution details */}
                      <td className="py-4 px-6">
                        {alert.acknowledged ? (
                          <div className="flex flex-col text-[11px]">
                            <span className="text-slate-300 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-emerald-400" />
                              {alert.acknowledgedBy || 'Supervisor'}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              {ackDateObj ? ackDateObj.toLocaleTimeString() : ''}
                            </span>
                          </div>
                        ) : (
                          <span className={`${isSim ? 'text-amber-400' : 'text-red-400'} font-medium text-[11px]`}>
                            {isSim ? 'Awaiting drill review...' : 'Awaiting urgent response!'}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 whitespace-nowrap text-right">
                        {!alert.acknowledged ? (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledgingId === alert.id}
                            className={`px-3 py-1.5 rounded-lg text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50 ${
                              isSim
                                ? 'bg-amber-600 hover:bg-amber-500'
                                : 'bg-emerald-600 hover:bg-emerald-500'
                            }`}
                            title={currentUser ? 'Acknowledge alert as logged-in administrator' : 'Acknowledge alert'}
                          >
                            {acknowledgingId === alert.id ? 'Saving...' : isSim ? 'Resolve Drill' : 'Acknowledge'}
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Done</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stream View */}
          <div className="md:hidden divide-y divide-slate-800/80">
            {filteredAlerts.map((alert) => {
              const dateObj = alert.timestamp ? new Date(alert.timestamp) : null;
              const isSim = isAlertSimulated(alert);

              return (
                <div
                  key={alert.id}
                  className={`p-4 space-y-3 ${
                    !alert.acknowledged
                      ? isSim
                        ? 'bg-amber-950/20'
                        : 'bg-red-950/25'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {!alert.acknowledged ? (
                      isSim ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          SIMULATED DRILL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                          ACTIVE REAL SOS
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {isSim ? 'Drill Resolved' : 'Resolved'}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-slate-300 font-semibold">
                        {alert.deviceId || 'device001'}
                      </span>
                      {isSim && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          Drill
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-300">
                    <p className="font-semibold text-slate-100">
                      {dateObj
                        ? `${dateObj.toLocaleDateString()} at ${dateObj.toLocaleTimeString()}`
                        : 'Unknown Date'}
                    </p>
                    {alert.acknowledged ? (
                      <p className="text-slate-400 text-[11px] mt-1">
                        Resolved by: {alert.acknowledgedBy || 'Admin'}
                      </p>
                    ) : (
                      <p className={`${isSim ? 'text-amber-400' : 'text-red-400'} text-[11px] mt-1 font-medium`}>
                        {isSim
                          ? 'Simulated drill testing event (not a real emergency).'
                          : 'Immediate assistance requested!'}
                      </p>
                    )}
                  </div>

                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgingId === alert.id}
                      className={`w-full py-2 rounded-xl text-white font-semibold text-xs shadow transition-colors disabled:opacity-50 ${
                        isSim
                          ? 'bg-amber-600 hover:bg-amber-500'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      {acknowledgingId === alert.id
                        ? 'Saving...'
                        : isSim
                          ? 'Resolve Simulated Drill'
                          : 'Acknowledge SOS Alert'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
