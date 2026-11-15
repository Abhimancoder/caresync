import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useProfile } from '../../contexts/ProfileContext.jsx';
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx';
import api from '../../services/api.js';
import { Check, X, Clock, AlertTriangle, Volume2, Pill } from 'lucide-react';

export default function TodayDosesCard({ onDoseUpdated }) {
  const { currentUser } = useAuth();
  const { activeProfile } = useProfile();
  const { speak } = useAccessibility();
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const canMarkDose = currentUser?.role === 'elderly' || currentUser?.role === 'caretaker';

  const fetchDoses = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/doses/today?profileId=${activeProfile?.id || 'demo-profile-robert'}`);
      setDoses(res.data || []);
    } catch (err) {
      console.warn('Failed to load doses:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoses();
  }, [activeProfile]);

  const handleStatusUpdate = async (doseId, status, notes = '') => {
    try {
      setUpdatingId(doseId);
      await api.patch(`/doses/${doseId}/status`, { status, notes });
      await fetchDoses();
      if (onDoseUpdated) onDoseUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSpeakDose = (dose) => {
    const text = `Time to take ${dose.medicationName}. Dosage is ${dose.dosage}. Scheduled for ${dose.scheduledTime}. ${dose.instructions || 'Take with water.'}`;
    speak(text);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Today's Medication Schedule</h2>
            <p className="text-xs text-slate-500">Scheduled doses for {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
          {doses.filter(d => d.status === 'taken').length} of {doses.length} Completed
        </span>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-400 text-sm">Loading today's schedule...</div>
      ) : doses.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          No medication doses scheduled for today.
        </div>
      ) : (
        <div className="space-y-3">
          {doses.map((dose) => {
            const isTaken = dose.status === 'taken';
            const isMissed = dose.status === 'missed';
            const isSkipped = dose.status === 'skipped';
            const isUpcoming = dose.status === 'upcoming';

            return (
              <div
                key={dose.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isTaken
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : isMissed
                    ? 'bg-red-50/60 border-red-200'
                    : isSkipped
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Dose details */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isTaken && <Check className="w-5 h-5 text-emerald-600" />}
                    {isMissed && <AlertTriangle className="w-5 h-5 text-red-600" />}
                    {isSkipped && <X className="w-5 h-5 text-amber-600" />}
                    {isUpcoming && <Clock className="w-5 h-5 text-blue-600" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-900">{dose.medicationName}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {dose.dosage}
                      </span>
                      <span className="text-xs font-bold text-primary-900 bg-blue-50 px-2 py-0.5 rounded">
                        {dose.scheduledTime}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      {dose.instructions || 'Take with water as directed by your physician.'}
                    </p>

                    {isTaken && dose.takenAt && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-1">
                        ✓ Taken at {new Date(dose.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {dose.takenByRole || 'user'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Speak Aloud Audio Button */}
                  <button
                    onClick={() => handleSpeakDose(dose)}
                    className="p-2 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    title="Read instructions aloud"
                    aria-label={`Read ${dose.medicationName} instructions aloud`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  {/* Dose Status Actions */}
                  {canMarkDose && isUpcoming && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(dose.id, 'taken')}
                        disabled={updatingId === dose.id}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Taken</span>
                      </button>

                      <button
                        onClick={() => {
                          const note = prompt('Reason for skipping dose (optional):', 'Doctor advice or nausea');
                          handleStatusUpdate(dose.id, 'skipped', note || '');
                        }}
                        disabled={updatingId === dose.id}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                      >
                        Skip
                      </button>
                    </>
                  )}

                  {isTaken && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Taken
                    </span>
                  )}

                  {isMissed && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Missed
                    </span>
                  )}

                  {isSkipped && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                      Skipped
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
