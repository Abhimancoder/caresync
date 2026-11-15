import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useProfile } from '../contexts/ProfileContext.jsx';
import AppointmentFormModal from '../components/appointments/AppointmentFormModal.jsx';
import ConfirmActionModal from '../components/common/ConfirmActionModal.jsx';
import api from '../services/api.js';
import { Calendar, Plus, MapPin, Clock, Stethoscope, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AppointmentsPage() {
  const { currentUser } = useAuth();
  const { activeProfile } = useProfile();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancellingAppt, setCancellingAppt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const canEdit = currentUser?.role === 'caretaker';

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/appointments?profileId=${activeProfile?.id || 'demo-profile-robert'}`);
      setAppointments({
        upcoming: res.upcoming || [],
        past: res.past || [],
      });
    } catch (err) {
      console.warn('Appointments load failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeProfile]);

  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;
    try {
      setActionLoading(true);
      setActionError('');
      await api.delete(`/appointments/${cancellingAppt.id}`);
      setCancellingAppt(null);
      await fetchAppointments();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const currentList = activeTab === 'upcoming' ? appointments.upcoming : appointments.past;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Doctor Appointments</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {appointments.upcoming.length} Upcoming
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Clinical visits, specialist consultations, and lab visits for {activeProfile?.fullName || 'Senior'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold" role="tablist" aria-label="Appointment view filter">
            <button
              onClick={() => setActiveTab('upcoming')}
              role="tab"
              aria-selected={activeTab === 'upcoming'}
              aria-label={`View upcoming appointments (${appointments.upcoming.length})`}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'upcoming' ? 'bg-primary-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming ({appointments.upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              role="tab"
              aria-selected={activeTab === 'past'}
              aria-label={`View past appointments (${appointments.past.length})`}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'past' ? 'bg-primary-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past Visits ({appointments.past.length})
            </button>
          </div>

          {canEdit && (
            <button
              onClick={() => setIsModalOpen(true)}
              aria-label="Schedule a doctor appointment"
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/10 transition-all"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Schedule Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* Appointment Cards */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm" role="status">Loading appointments...</div>
      ) : currentList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-200">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-800">No {activeTab} appointments</h3>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'upcoming' ? 'Click "Schedule Visit" to record an upcoming appointment.' : 'No past appointment history recorded.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentList.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {appt.specialty || 'General Medicine'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{appt.doctorName}</h3>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-xl bg-blue-50 text-primary-900 text-xs font-extrabold border border-blue-100">
                      {appt.appointmentDate}
                    </span>
                    <p className="text-xs font-semibold text-slate-600 mt-1">{appt.appointmentTime}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-800">{appt.hospitalClinic}</span>
                  </div>

                  {appt.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed mt-2">
                      <strong>Preparation Notes:</strong> {appt.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Status: <strong className="text-slate-700 capitalize">{appt.status}</strong>
                </span>

                {canEdit && (
                  <button
                    onClick={() => {
                      setActionError('');
                      setCancellingAppt(appt);
                    }}
                    aria-label={`Cancel visit with ${appt.doctorName}`}
                    className="text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Cancel Visit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Form Modal */}
      <AppointmentFormModal
        profileId={activeProfile?.id || 'demo-profile-robert'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAppointments}
      />

      {/* Accessible Confirm Cancellation Modal */}
      <ConfirmActionModal
        isOpen={!!cancellingAppt}
        title="Cancel Appointment"
        message={`Are you sure you want to cancel the clinical appointment with ${cancellingAppt?.doctorName} scheduled for ${cancellingAppt?.appointmentDate} at ${cancellingAppt?.appointmentTime}?`}
        confirmLabel="Cancel Appointment"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleConfirmCancel}
        onClose={() => {
          setCancellingAppt(null);
          setActionError('');
        }}
      />
    </div>
  );
}
