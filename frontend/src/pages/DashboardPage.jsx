import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useProfile } from '../contexts/ProfileContext.jsx';
import TodayDosesCard from '../components/dashboard/TodayDosesCard.jsx';
import QuickAdherenceWidget from '../components/dashboard/QuickAdherenceWidget.jsx';
import UpcomingAppointmentsCard from '../components/dashboard/UpcomingAppointmentsCard.jsx';
import RecentActivityList from '../components/dashboard/RecentActivityList.jsx';
import { HeartPulse, ShieldAlert, Sparkles, PhoneCall, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { activeProfile } = useProfile();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const seniorName = activeProfile?.fullName || 'Robert Harrison';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                PROMPTWARS × CATALYST CHALLENGE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-blue-200">
                Sample Data Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {currentUser?.displayName || 'Caregiver'}
            </h1>
            <p className="text-sm sm:text-base text-blue-100 mt-1 max-w-2xl leading-relaxed">
              Monitoring daily care, medication schedules, and clinical appointments for{' '}
              <strong className="text-white underline decoration-teal-400 underline-offset-4">
                {seniorName}
              </strong>.
            </p>
          </div>

          {/* Quick senior mode jump */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <Link
              to="/senior-view"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Launch Senior Mode</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Doses Checklist & Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Schedule (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          <TodayDosesCard onDoseUpdated={() => setRefreshTrigger(prev => prev + 1)} />
          <RecentActivityList key={`activity-${refreshTrigger}`} />
        </div>

        {/* Right Column: Adherence & Next Appointment */}
        <div className="space-y-6">
          <QuickAdherenceWidget key={`adherence-${refreshTrigger}`} />
          <UpcomingAppointmentsCard />
        </div>
      </div>
    </div>
  );
}
