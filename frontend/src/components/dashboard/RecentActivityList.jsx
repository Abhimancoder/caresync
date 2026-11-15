import React, { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext.jsx';
import api from '../../services/api.js';
import { History, ShieldCheck, Check, Plus, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RecentActivityList() {
  const { activeProfile } = useProfile();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await api.get(`/activity-logs?profileId=${activeProfile?.id || 'demo-profile-robert'}&limit=6`);
        setLogs(res.data || []);
      } catch (err) {
        console.warn('Activity log warning:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [activeProfile]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Care Ecosystem Activity Trail</h3>
            <p className="text-xs text-slate-500">Live audit log of all caregiver and senior actions</p>
          </div>
        </div>
        <Link
          to="/activity-log"
          className="text-xs text-primary-900 hover:text-blue-700 font-semibold flex items-center gap-1"
        >
          <span>Full Audit Log</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-400 text-xs">Loading activity stream...</div>
      ) : logs.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-xs">No recorded events yet.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isTaken = log.action.includes('TAKEN');
            const isAdded = log.action.includes('ADDED') || log.action.includes('CREATED');
            const isMissed = log.action.includes('MISSED');

            return (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start gap-3 text-xs">
                <div className="mt-0.5 flex-shrink-0">
                  {isTaken && <Check className="w-4 h-4 text-emerald-600" />}
                  {isAdded && <Plus className="w-4 h-4 text-blue-600" />}
                  {isMissed && <AlertCircle className="w-4 h-4 text-red-600" />}
                  {!isTaken && !isAdded && !isMissed && <ShieldCheck className="w-4 h-4 text-slate-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium leading-relaxed">{log.details}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="font-semibold text-primary-900">By: {log.actorName} ({log.actorRole})</span>
                    <span>•</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
