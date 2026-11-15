import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  LayoutDashboard,
  CheckCircle2,
  Pill,
  BarChart3,
  CalendarDays,
  UserCheck,
  Users,
  History,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar() {
  const { currentUser } = useAuth();
  const isElderly = currentUser?.role === 'elderly';

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/senior-view',
      label: 'Senior Daily View',
      icon: CheckCircle2,
      badge: 'Easy',
      highlight: true,
    },
    {
      to: '/medications',
      label: 'Medications',
      icon: Pill,
      badge: null,
    },
    {
      to: '/adherence',
      label: 'Adherence Analytics',
      icon: BarChart3,
      badge: 'Chart.js',
    },
    {
      to: '/appointments',
      label: 'Doctor Appointments',
      icon: CalendarDays,
      badge: null,
    },
    {
      to: '/profile',
      label: 'Health Profile',
      icon: UserCheck,
      badge: null,
    },
    {
      to: '/care-team',
      label: 'Care Team & Passcodes',
      icon: Users,
      badge: null,
    },
    {
      to: '/activity-log',
      label: 'Audit Activity Log',
      icon: History,
      badge: null,
    },
  ];

  return (
    <aside
      className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between py-6 px-4 shadow-sm min-h-[calc(100vh-4rem)]"
      aria-label="Sidebar Navigation"
    >
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Care Management
          </p>
          <nav className="space-y-1" aria-label="Care Management Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-primary-900 text-white shadow-md shadow-primary-900/10'
                        : item.highlight
                        ? 'bg-blue-50 text-blue-900 hover:bg-blue-100/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Security / Compliance Badge */}
        <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2 text-primary-900 mb-1">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold">Secure Healthcare Node</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Protected by Firebase Auth, Cloud Firestore & bcrypt passcodes.
          </p>
        </div>
      </div>

      {/* Role Footer Card */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-xl">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
            {currentUser?.role === 'elderly' ? '👴' : currentUser?.role === 'caretaker' ? '👩‍⚕️' : '👨‍👦'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{currentUser?.displayName}</p>
            <p className="text-[10px] text-slate-500 capitalize">{currentUser?.role} Account</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
