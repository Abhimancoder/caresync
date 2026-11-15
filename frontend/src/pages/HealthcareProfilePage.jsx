import React, { useState } from 'react';
import { useProfile } from '../contexts/ProfileContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import { UserCheck, PhoneCall, ShieldAlert, Heart, FileText, Edit3, Check } from 'lucide-react';

export default function HealthcareProfilePage() {
  const { activeProfile, fetchProfiles } = useProfile();
  const { currentUser } = useAuth();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState(activeProfile?.medicalNotes || '');
  const [saving, setSaving] = useState(false);

  const canEdit = currentUser?.role === 'caretaker';

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      await api.put(`/profiles/${activeProfile?.id}`, { medicalNotes });
      await fetchProfiles();
      setIsEditingNotes(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-900 to-teal-700 text-white flex items-center justify-center text-3xl font-black shadow-md">
            👴
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{activeProfile?.fullName || 'Robert Harrison'}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                Primary Profile
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Age: <strong>{activeProfile?.age || 78}</strong> • DOB: <strong>{activeProfile?.dateOfBirth || 'June 12, 1948'}</strong> • Blood Group: <strong className="text-red-600">{activeProfile?.bloodGroup || 'O+'}</strong>
            </p>
          </div>
        </div>

        <div className="px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-slate-600">
          <p className="font-semibold text-primary-900">Protected Care Record</p>
          <p className="text-[11px] text-slate-500">ID: {activeProfile?.id}</p>
        </div>
      </div>

      {/* Allergies & Emergency Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allergies Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm" role="region" aria-label="Allergies Information">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center" aria-hidden="true">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Documented Drug Allergies</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {(activeProfile?.allergies || ['Penicillin', 'Sulfa drugs']).map((allergy, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-1.5"
              >
                <span aria-hidden="true">⚠️</span>
                <span>{allergy}</span>
              </span>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
            Highlighted for attending paramedics and healthcare providers during urgent appointments.
          </p>
        </div>

        {/* Emergency Contacts Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm" role="region" aria-label="Emergency Contacts Directory">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center" aria-hidden="true">
              <PhoneCall className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Emergency Contacts</h3>
          </div>

          <div className="space-y-3">
            {(activeProfile?.emergencyContacts || []).map((contact, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{contact.name}</p>
                  <p className="text-slate-500">{contact.relationship}</p>
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  aria-label={`Call emergency contact ${contact.name} at ${contact.phone}`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                >
                  <PhoneCall className="w-3 h-3" aria-hidden="true" />
                  <span>{contact.phone}</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clinical Notes & Health Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm" role="region" aria-label="Clinical Healthcare Notes">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center" aria-hidden="true">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Clinical Healthcare Notes</h3>
              <p className="text-xs text-slate-500">Shared observation records for attending caregivers and family</p>
            </div>
          </div>

          {canEdit && !isEditingNotes && (
            <button
              onClick={() => {
                setMedicalNotes(activeProfile?.medicalNotes || '');
                setIsEditingNotes(true);
              }}
              aria-label="Edit clinical healthcare notes"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Edit Notes</span>
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <div className="space-y-3">
            <textarea
              rows="4"
              value={medicalNotes}
              aria-label="Clinical healthcare observation notes"
              onChange={(e) => setMedicalNotes(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Record health observations, dietary needs, or condition notes..."
            ></textarea>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditingNotes(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                aria-label="Save clinical healthcare notes"
                className="flex items-center gap-1 px-4 py-1.5 bg-primary-900 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{saving ? 'Saving...' : 'Save Notes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {activeProfile?.medicalNotes || 'No special medical notes recorded yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
