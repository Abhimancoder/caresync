import React, { useState, useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext.jsx';
import { useAccessibility } from '../contexts/AccessibilityContext.jsx';
import api from '../services/api.js';
import { Check, Volume2, Pill, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ElderlyChecklistPage() {
  const { activeProfile } = useProfile();
  const { speak, isSpeaking } = useAccessibility();
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchDoses = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/doses/today?profileId=${activeProfile?.id || 'demo-profile-robert'}`);
      setDoses(res.data || []);
    } catch (err) {
      console.warn('Dose load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoses();
  }, [activeProfile]);

  const handleMarkTaken = async (dose) => {
    try {
      setUpdatingId(dose.id);
      await api.patch(`/doses/${dose.id}/status`, { status: 'taken' });
      speak(`Great job! You marked ${dose.medicationName} as taken.`);
      await fetchDoses();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReadFullSchedule = () => {
    if (doses.length === 0) {
      speak('You have no medications scheduled for today. Have a wonderful day!');
      return;
    }

    const remaining = doses.filter(d => d.status === 'upcoming');
    let speech = `Hello ${activeProfile?.fullName || 'there'}. Today you have ${doses.length} scheduled doses. `;
    if (remaining.length === 0) {
      speech += 'All doses for today are completed! Great job taking care of your health.';
    } else {
      speech += `You have ${remaining.length} doses remaining to take today. `;
      remaining.forEach(d => {
        speech += `${d.medicationName}, ${d.dosage}, scheduled for ${d.scheduledTime}. `;
      });
    }
    speak(speech);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Accessible Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-primary-200 shadow-md">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-600 hover:text-primary-900 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={handleReadFullSchedule}
            aria-label="Read today's medication schedule aloud using speech synthesis"
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm sm:text-base shadow-md transition-all active:scale-95"
          >
            <Volume2 className="w-5 h-5" aria-hidden="true" />
            <span>{isSpeaking ? 'Listening...' : 'Read My Schedule Aloud'}</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-primary-900 tracking-tight">
          Today's Medicines Checklist
        </h1>
        <p className="text-base sm:text-lg text-slate-600 mt-2">
          Tap the big green button below when you have swallowed your medicine.
        </p>
      </div>

      {/* Large Touch Target Medication Cards */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center text-xl font-bold text-slate-500">
          Loading your medicines...
        </div>
      ) : doses.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border-2 border-slate-200">
          <p className="text-2xl font-bold text-slate-800">No medicines scheduled for today! 🎉</p>
          <p className="text-base text-slate-500 mt-2">Check back tomorrow or ask your nurse.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {doses.map((dose) => {
            const isTaken = dose.status === 'taken';

            return (
              <div
                key={dose.id}
                className={`p-6 sm:p-8 rounded-3xl border-3 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  isTaken
                    ? 'bg-emerald-50/90 border-emerald-400'
                    : 'bg-white border-blue-200 hover:border-blue-400 shadow-md'
                }`}
              >
                {/* Medicine info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 rounded-xl text-base font-extrabold bg-primary-100 text-primary-900">
                      ⏰ {dose.scheduledTime}
                    </span>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                      {dose.form}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {dose.medicationName}{' '}
                    <span className="text-xl font-bold text-teal-700">({dose.dosage})</span>
                  </h2>

                  <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed max-w-xl">
                    {dose.instructions || 'Take with water.'}
                  </p>

                  {isTaken && (
                    <p className="text-base font-bold text-emerald-800 flex items-center gap-2 pt-1">
                      <Check className="w-6 h-6 text-emerald-600" />
                      <span>Completed! Taken at {new Date(dose.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  )}
                </div>

                {/* Big Action Button */}
                <div className="flex-shrink-0">
                  {isTaken ? (
                    <div className="px-6 py-4 bg-emerald-100 text-emerald-900 rounded-2xl font-black text-lg flex items-center gap-2 border border-emerald-300">
                      <Check className="w-6 h-6 text-emerald-700" />
                      <span>Dose Taken ✓</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkTaken(dose)}
                      disabled={updatingId === dose.id}
                      aria-label={`Mark ${dose.medicationName} ${dose.dosage} scheduled for ${dose.scheduledTime} as taken`}
                      className="w-full md:w-auto px-8 py-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xl rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all"
                    >
                      <Check className="w-7 h-7" aria-hidden="true" />
                      <span>{updatingId === dose.id ? 'Saving...' : 'I Took This Medicine'}</span>
                    </button>
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
