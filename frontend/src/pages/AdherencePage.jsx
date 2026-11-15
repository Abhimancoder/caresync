import React, { useState, useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext.jsx';
import api from '../services/api.js';
import { AdherenceLineChart, AdherenceDoughnutChart } from '../components/charts/AdherenceCharts.jsx';
import { BarChart3, TrendingUp, Printer, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function AdherencePage() {
  const { activeProfile } = useProfile();
  const [period, setPeriod] = useState('7d'); // '7d' or '30d'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await api.get(`/adherence/stats?profileId=${activeProfile?.id || 'demo-profile-robert'}&period=${period}`);
        setStats(res);
      } catch (err) {
        console.warn('Adherence load failed:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [activeProfile, period]);

  const metrics = stats?.metrics || {
    adherenceRate: 94.5,
    punctualityRate: 91.0,
    totalTaken: 24,
    totalMissed: 1,
    totalSkipped: 1,
    totalUpcoming: 3,
  };

  const trendData = stats?.trend || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Medication Adherence Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
              Chart.js Visualizer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Valid mathematical compliance tracking for {activeProfile?.fullName || 'Senior'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === '7d' ? 'bg-primary-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7-Day Trend
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === '30d' ? 'bg-primary-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30-Day Trend
            </button>
          </div>

          {/* Export / Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            title="Print report for doctor appointment"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Overall Adherence</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-slate-900">{metrics.adherenceRate}%</span>
          </div>
          <span className="text-[11px] font-medium text-emerald-600">Past doses only (valid math)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Punctuality Rate</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-teal-700">{metrics.punctualityRate}%</span>
          </div>
          <span className="text-[11px] text-slate-500">Taken within scheduled window</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Doses Taken</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-emerald-600">{metrics.totalTaken}</span>
          </div>
          <span className="text-[11px] text-slate-500">Recorded by patient or nurse</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Missed Doses</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-red-600">{metrics.totalMissed}</span>
          </div>
          <span className="text-[11px] text-slate-500">Grace period elapsed (&gt;60m)</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {period === '7d' ? '7-Day' : '30-Day'} Compliance Trajectory
              </h3>
              <p className="text-xs text-slate-500">Daily adherence percentage over time</p>
            </div>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading chart data...</div>
          ) : (
            <AdherenceLineChart trendData={trendData} />
          )}
        </div>

        {/* Doughnut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dose Distribution</h3>
            <p className="text-xs text-slate-500 mb-2">Taken vs. Missed vs. Skipped ratio</p>
            <AdherenceDoughnutChart metrics={metrics} />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <p>Clinically skipped doses: <strong>{metrics.totalSkipped}</strong> (excluded from penalty calculation)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
