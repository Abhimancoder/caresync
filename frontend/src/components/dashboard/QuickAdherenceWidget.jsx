import React, { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext.jsx';
import api from '../../services/api.js';
import { BarChart3, TrendingUp, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuickAdherenceWidget({ refreshTrigger = 0 }) {
  const { activeProfile } = useProfile();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await api.get(`/adherence/stats?profileId=${activeProfile?.id || 'demo-profile-robert'}&period=7d`);
        setStats(res);
      } catch (err) {
        console.warn('Adherence stats warning:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [activeProfile, refreshTrigger]);

  const metrics = stats?.metrics || {
    adherenceRate: 94.5,
    punctualityRate: 91.0,
    totalTaken: 24,
    totalMissed: 1,
    totalSkipped: 1,
  };

  const rate = metrics.adherenceRate;
  const isExcellent = rate >= 90;
  const isGood = rate >= 75 && rate < 90;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center" aria-hidden="true">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">7-Day Adherence Overview</h3>
          </div>
          <Link
            to="/adherence"
            aria-label="View detailed adherence charts and compliance analytics"
            className="text-xs text-primary-900 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            <span>Detailed Charts</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Circular Rate Display */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{rate}%</span>
              <span className="text-xs font-semibold text-slate-500">compliance</span>
            </div>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              {isExcellent ? '🌟 Outstanding Adherence' : isGood ? '👍 Good Compliance' : '⚠️ Attention Needed'}
            </p>
          </div>

          <div className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-teal-500 bg-teal-50 text-teal-800 font-bold text-sm shadow-inner">
            {metrics.totalTaken}/{metrics.totalTaken + metrics.totalMissed}
          </div>
        </div>

        {/* Breakdown Badges */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
          <div className="p-2 bg-emerald-50 rounded-xl">
            <span className="block text-xs font-bold text-emerald-700">{metrics.totalTaken}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Taken</span>
          </div>
          <div className="p-2 bg-red-50 rounded-xl">
            <span className="block text-xs font-bold text-red-700">{metrics.totalMissed}</span>
            <span className="text-[10px] text-red-600 font-medium">Missed</span>
          </div>
          <div className="p-2 bg-amber-50 rounded-xl">
            <span className="block text-xs font-bold text-amber-700">{metrics.totalSkipped}</span>
            <span className="text-[10px] text-amber-600 font-medium">Skipped</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-50">
        Punctuality: <strong>{metrics.punctualityRate || 92}%</strong> taken within scheduled window.
      </p>
    </div>
  );
}
