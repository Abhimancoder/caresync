import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useProfile } from '../../contexts/ProfileContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import { HeartPulse, PhoneCall, Shield, User, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { currentUser, loginWithDemo, logout } = useAuth();
  const { activeProfile } = useProfile();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group focus:outline-none" aria-label="CareSync Healthcare Home">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-900 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform" aria-hidden="true">
                <HeartPulse className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-primary-900">
                  Care<span className="text-teal-600">Sync</span>
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  HEALTH
                </span>
              </div>
            </Link>
          </div>

          {/* Active Profile Info */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 rounded-full border border-blue-100 text-xs font-medium text-slate-700" role="status" aria-label="Active Profile Information">
            <span className="flex h-2 w-2 rounded-full bg-teal-500" aria-hidden="true"></span>
            <span>Active Senior: <strong>{activeProfile?.fullName || 'Robert Harrison'}</strong> ({activeProfile?.age || 78} yrs)</span>
          </div>

          {/* Quick Role Switcher for Evaluators */}
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold" role="group" aria-label="Switch User Persona Role">
            <span className="text-[11px] text-slate-500 px-2">Role:</span>
            <button
              onClick={() => loginWithDemo('elderly')}
              aria-pressed={currentUser?.role === 'elderly'}
              aria-label="Switch role to Senior Patient"
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentUser?.role === 'elderly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👴 Senior
            </button>
            <button
              onClick={() => loginWithDemo('caretaker')}
              aria-pressed={currentUser?.role === 'caretaker'}
              aria-label="Switch role to Nurse Caretaker"
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentUser?.role === 'caretaker'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👩‍⚕️ Nurse / Caretaker
            </button>
            <button
              onClick={() => loginWithDemo('family')}
              aria-pressed={currentUser?.role === 'family'}
              aria-label="Switch role to Family Member"
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentUser?.role === 'family'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👨‍👦 Family
            </button>
          </div>

          {/* Actions: Emergency SOS, Notifications, User */}
          <div className="flex items-center gap-2">
            {/* Quick Emergency SOS Button */}
            <button
              onClick={() => setShowEmergencyModal(true)}
              aria-label="Open emergency contacts dialog"
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-md shadow-red-600/20 active:scale-95 transition-all"
              title="View Emergency Contacts"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-bounce" aria-hidden="true" />
              <span>SOS Emergency</span>
            </button>

            {/* In-App Notifications */}
            <NotificationBell />

            {/* User Avatar & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">{currentUser?.displayName}</p>
                <span className="text-[10px] text-slate-500 capitalize">{currentUser?.role}</span>
              </div>
              <button
                onClick={logout}
                aria-label="Sign Out"
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Emergency Contacts Modal */}
      {showEmergencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-red-500">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-8 h-8" aria-hidden="true" />
              <div>
                <h3 id="emergency-modal-title" className="text-lg font-black text-slate-900">Emergency Contacts</h3>
                <p className="text-xs text-slate-500">For {activeProfile?.fullName || 'Senior'}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {(activeProfile?.emergencyContacts || []).map((contact, idx) => (
                <div key={idx} className="p-3 bg-red-50/60 rounded-xl border border-red-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{contact.name}</p>
                    <p className="text-xs text-slate-600">{contact.relationship}</p>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    aria-label={`Call ${contact.name} at ${contact.phone}`}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                  >
                    <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{contact.phone}</span>
                  </a>
                </div>
              ))}

              <div className="p-3 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">National Emergency Services</p>
                  <p className="text-xs text-slate-500">Ambulance, Police, Fire</p>
                </div>
                <a
                  href="tel:911"
                  aria-label="Call National Emergency Services at 911 or 112"
                  className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  Dial 911 / 112
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowEmergencyModal(false)}
              aria-label="Close emergency contacts dialog"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
