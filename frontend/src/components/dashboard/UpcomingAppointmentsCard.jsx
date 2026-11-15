import React, { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext.jsx';
import api from '../../services/api.js';
import { Calendar, MapPin, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UpcomingAppointmentsCard() {
  const { activeProfile } = useProfile();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppointments() {
      try {
        setLoading(true);
        const res = await api.get(`/appointments?profileId=${activeProfile?.id || 'demo-profile-robert'}`);
        setAppointments(res.upcoming || []);
      } catch (err) {
        console.warn('Appointments warning:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAppointments();
  }, [activeProfile]);

  const nextAppt = appointments[0];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center" aria-hidden="true">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upcoming Medical Visit</h3>
          </div>
          <Link
            to="/appointments"
            aria-label="View all scheduled medical appointments"
            className="text-xs text-primary-900 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="py-6 text-center text-slate-400 text-xs">Loading appointments...</div>
        ) : !nextAppt ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No upcoming medical appointments scheduled.
          </div>
        ) : (
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/80">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{nextAppt.doctorName}</p>
                <p className="text-xs font-semibold text-teal-700">{nextAppt.specialty || 'General Physician'}</p>
              </div>
              <span className="px-2.5 py-1 bg-white text-primary-900 text-[11px] font-bold rounded-lg shadow-xs border border-blue-100">
                {nextAppt.appointmentDate}
              </span>
            </div>

            <div className="mt-2.5 space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{nextAppt.appointmentTime}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="truncate">{nextAppt.hospitalClinic}</span>
              </div>
            </div>

            {nextAppt.notes && (
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-blue-100/60 line-clamp-2">
                Note: {nextAppt.notes}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">Total Upcoming: <strong>{appointments.length}</strong></span>
        <Link to="/appointments" className="font-semibold text-primary-900 hover:underline">
          + Add Appointment
        </Link>
      </div>
    </div>
  );
}
