import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useProfile } from '../contexts/ProfileContext.jsx';
import MedicationFormModal from '../components/medications/MedicationFormModal.jsx';
import ConfirmActionModal from '../components/common/ConfirmActionModal.jsx';
import api from '../services/api.js';
import { Pill, Plus, Clock, Stethoscope, Trash2, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';

export default function MedicationsPage() {
  const { currentUser } = useAuth();
  const { activeProfile } = useProfile();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingMed, setDeletingMed] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const canEdit = currentUser?.role === 'caretaker';

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/medications?profileId=${activeProfile?.id || 'demo-profile-robert'}`);
      setMedications(res.data || []);
    } catch (err) {
      console.warn('Failed to load medications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [activeProfile]);

  const handleConfirmDelete = async () => {
    if (!deletingMed) return;
    try {
      setActionLoading(true);
      setActionError('');
      await api.delete(`/medications/${deletingMed.id}`);
      setDeletingMed(null);
      await fetchMedications();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Active Prescriptions</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {medications.length} Prescribed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prescriptions and daily dosage schedules for {activeProfile?.fullName || 'Senior'}
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            aria-label="Add new prescription"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-900 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-900/10 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Prescription</span>
          </button>
        )}
      </div>

      {/* Medical Safety Disclaimer */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-3 text-xs text-blue-900" role="note" aria-label="Clinical Guardrail Note">
        <ShieldCheck className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong>Clinical Guardrail:</strong> CareSync is a coordination and reminder tool. All medications and dosages are displayed strictly as entered by authorized caregivers and physicians. Never adjust prescription dosages without physician guidance.
        </span>
      </div>

      {/* Medication Cards List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm" role="status">Loading prescriptions...</div>
      ) : medications.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-200">
          <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-800">No active medications</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Add Prescription" above to record a new medicine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((med) => (
            <div
              key={med.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {med.form || 'Tablet'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{med.name}</h3>
                    <p className="text-sm font-semibold text-primary-900">{med.dosage} {med.unit}</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setActionError('');
                        setDeletingMed(med);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Deactivate prescription"
                      aria-label={`Deactivate prescription for ${med.name}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>Times: <strong>{(med.scheduledTimes || []).join(', ')}</strong></span>
                  </div>

                  {med.prescribingDoctor && (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span className="truncate">Doctor: {med.prescribingDoctor}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>Started: {med.startDate || 'Recent'}</span>
                  </div>
                </div>

                {med.instructions && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    <strong>Instructions:</strong> {med.instructions}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="capitalize">{med.frequency?.replace('_', ' ') || 'Daily'}</span>
                <span className="text-emerald-700 font-semibold">Active Prescription</span>
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

      {/* Add Medication Modal */}
      <MedicationFormModal
        profileId={activeProfile?.id || 'demo-profile-robert'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchMedications}
      />

      {/* Accessible Confirm Deactivation Modal */}
      <ConfirmActionModal
        isOpen={!!deletingMed}
        title="Deactivate Prescription"
        message={`Are you sure you want to deactivate the prescription for ${deletingMed?.name}? This will archive the medication and halt daily dose generation.`}
        confirmLabel="Deactivate Prescription"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeletingMed(null);
          setActionError('');
        }}
      />
    </div>
  );
}
