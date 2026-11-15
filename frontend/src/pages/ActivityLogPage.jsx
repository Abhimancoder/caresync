import React, { useState, useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext.jsx';
import api from '../services/api.js';
import { History, ShieldCheck, Check, Plus, AlertCircle, RefreshCw } from 'lucide-react';

export default function ActivityLogPage() {
  const { activeProfile } = useProfile();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/activity-logs?profileId=${activeProfile?.id || 'demo-profile-robert'}&limit=100`);
      setLogs(res.data || []);
    } catch (err) {
      console.warn('Activity logs failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeProfile]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Audit Activity Trail</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              Immutable Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete event log of all medication doses, schedule edits, and team invitations for {activeProfile?.fullName || 'Senior'}
          </p>
        </div>

        <button
          onClick={fetchLogs}
          aria-label="Refresh audit activity log"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Refresh audit feed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Log Feed */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs" role="status">Loading activity stream...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No activity entries recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const isTaken = log.action.includes('TAKEN');
              const isAdded = log.action.includes('ADDED') || log.action.includes('CREATED');
              const isMissed = log.action.includes('MISSED');
              const isInvite = log.action.includes('INVITATION');

              return (
                <div key={log.id} className="py-4 flex items-start gap-4 text-xs">
                  <div className="mt-0.5 p-2 rounded-xl bg-slate-100 flex-shrink-0" aria-hidden="true">
                    {isTaken && <Check className="w-4 h-4 text-emerald-600" />}
                    {isAdded && <Plus className="w-4 h-4 text-blue-600" />}
                    {isMissed && <AlertCircle className="w-4 h-4 text-red-600" />}
                    {isInvite && <ShieldCheck className="w-4 h-4 text-teal-600" />}
                    {!isTaken && !isAdded && !isMissed && !isInvite && <History className="w-4 h-4 text-slate-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium leading-relaxed mt-1">{log.details}</p>

                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                      <span className="font-semibold text-primary-900">Actor: {log.actorName}</span>
                      <span>•</span>
                      <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 font-semibold">{log.actorRole}</span>
                      <span>•</span>
                      <span className="text-slate-400">Target: {log.entityType} ({log.entityId})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
