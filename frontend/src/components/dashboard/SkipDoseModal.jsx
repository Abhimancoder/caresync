import React, { useState, useEffect } from 'react';
import { Clock, X, ShieldAlert } from 'lucide-react';

/**
 * Accessible Clinical Skip Dose Dialog
 * Replaces unstyled, blocking window.prompt().
 * Records structured, clinical skip reasons for care team transparency.
 */
export default function SkipDoseModal({
  dose,
  isOpen,
  onClose,
  onConfirmSkip,
  isLoading = false,
}) {
  const [selectedReason, setSelectedReason] = useState('Doctor advised hold');
  const [customNote, setCustomNote] = useState('');

  const REASONS = [
    'Doctor advised hold (e.g. low blood pressure or test)',
    'Fasting for laboratory bloodwork or procedure',
    'Senior experiencing upset stomach / nausea',
    'Prescription temporarily unavailable / refill pending',
  ];

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !dose) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = customNote.trim()
      ? `${selectedReason} - ${customNote.trim()}`
      : selectedReason;
    onConfirmSkip(dose.id, finalReason);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-dose-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center" aria-hidden="true">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 id="skip-dose-modal-title" className="text-base font-bold text-slate-900">
                Record Clinical Skip
              </h3>
              <p className="text-xs text-slate-500">
                {dose.medicationName} ({dose.dosage}) at {dose.scheduledTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close skip dose modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Clinical Reason for Skipping:
            </label>
            <div className="space-y-2">
              {REASONS.map((reason, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'border-amber-400 bg-amber-50/70 text-slate-900 font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="skipReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="skip-custom-note" className="block font-semibold text-slate-700 mb-1">
              Additional Notes (Optional):
            </label>
            <input
              id="skip-custom-note"
              type="text"
              placeholder="e.g. Advised by Dr. Martinez during morning visit"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2" role="note">
            <ShieldAlert className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Clinical Guardrail:</strong> Valid skips do not penalize adherence rate calculations. The reason will be recorded in the audit trail.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition-all"
            >
              {isLoading ? 'Recording...' : 'Record Clinical Skip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
