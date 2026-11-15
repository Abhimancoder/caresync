import React, { useState } from 'react';
import api from '../../services/api.js';
import { X, KeyRound, Copy, Check, ShieldCheck, Clock } from 'lucide-react';

export default function InviteMemberModal({ profileId, isOpen, onClose, onSuccess }) {
  const [role, setRole] = useState('family');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/invitations/generate', {
        profileId,
        role,
        recipientEmail: recipientEmail || undefined,
        maxUses: 1,
      });
      setGeneratedInvite(res);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedInvite?.passcode) {
      navigator.clipboard.writeText(generatedInvite.passcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleReset = () => {
    setGeneratedInvite(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Generate Caregiver Passcode</h3>
          </div>
          <button onClick={handleReset} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {!generatedInvite ? (
          <form onSubmit={handleGenerate} className="mt-4 space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Generate a time-limited 6-character access passcode to securely authorize a family member or nurse aide to access this healthcare profile.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Access Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
              >
                <option value="family">Family Member (View Schedule, Adherence & Alerts)</option>
                <option value="caretaker">Caretaker / Nurse (Full Access to Prescriptions & Doses)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recipient Email (Optional)</label>
              <input
                type="email"
                placeholder="e.g. michael.harrison@gmail.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">If provided, the invitation details will be recorded for audit verification.</p>
            </div>

            {/* Security note */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Cryptographic Protection:</strong> The generated code is hashed with bcrypt and expires automatically after 72 hours. Passcodes are rate-limited to 5 verification attempts.
              </span>
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
                {loading ? 'Generating...' : 'Generate Passcode'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-4 text-xs text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900">Passcode Ready to Share</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Share this one-time code with the invited member.
              </p>
            </div>

            {/* Passcode Callout */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border-2 border-primary-500 shadow-lg">
              <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400 block mb-1">
                Access Passcode
              </span>
              <span className="text-3xl font-mono font-black tracking-widest text-white select-all">
                {generatedInvite.passcode}
              </span>
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mt-2">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Valid for 72 Hours • Role: <strong>{generatedInvite.role}</strong></span>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Passcode Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Passcode</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
