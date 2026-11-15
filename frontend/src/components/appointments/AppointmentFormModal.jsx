import React, { useState } from 'react';
import api from '../../services/api.js';
import { X, Calendar, MapPin, Clock, Stethoscope } from 'lucide-react';

export default function AppointmentFormModal({ profileId, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    doctorName: '',
    specialty: '',
    hospitalClinic: '',
    appointmentDate: '',
    appointmentTime: '10:00',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.doctorName || !formData.hospitalClinic || !formData.appointmentDate) {
      setError('Doctor name, clinic location, and appointment date are required.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/appointments', {
        ...formData,
        profileId,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center" aria-hidden="true">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 id="appointment-modal-title" className="text-base font-bold text-slate-900">
              Schedule Doctor Appointment
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close schedule appointment modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label htmlFor="appt-doctor-name" className="block font-semibold text-slate-700 mb-1">
              Doctor / Specialist Name *
            </label>
            <input
              id="appt-doctor-name"
              type="text"
              required
              placeholder="e.g. Dr. Angela Martinez, MD"
              value={formData.doctorName}
              onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="appt-specialty" className="block font-semibold text-slate-700 mb-1">
              Medical Specialty
            </label>
            <input
              id="appt-specialty"
              type="text"
              placeholder="e.g. Cardiology, Endocrinology, Geriatrics"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="appt-clinic" className="block font-semibold text-slate-700 mb-1">
              Hospital / Clinic Location *
            </label>
            <input
              id="appt-clinic"
              type="text"
              required
              placeholder="e.g. St. Jude Health Center, Suite 402"
              value={formData.hospitalClinic}
              onChange={(e) => setFormData({ ...formData, hospitalClinic: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="appt-date" className="block font-semibold text-slate-700 mb-1">
                Appointment Date *
              </label>
              <input
                id="appt-date"
                type="date"
                required
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="appt-time" className="block font-semibold text-slate-700 mb-1">
                Appointment Time *
              </label>
              <input
                id="appt-time"
                type="time"
                required
                value={formData.appointmentTime}
                onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="appt-notes" className="block font-semibold text-slate-700 mb-1">
              Preparation Notes / Instructions
            </label>
            <textarea
              id="appt-notes"
              rows="2"
              placeholder="e.g. Fasting 8 hours prior. Bring recent blood pressure log and current prescription bottles."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            ></textarea>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary-900 hover:bg-primary-800 text-white rounded-xl font-bold shadow-md shadow-primary-900/10"
            >
              {loading ? 'Scheduling...' : 'Save Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
