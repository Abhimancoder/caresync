import React, { useState } from 'react';
import { useProfile } from '../contexts/ProfileContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import InviteMemberModal from '../components/collaboration/InviteMemberModal.jsx';
import api from '../services/api.js';
import { Users, KeyRound, UserPlus, ShieldCheck, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CareTeamPage() {
  const { activeProfile, fetchProfiles } = useProfile();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [joinPasscode, setJoinPasscode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState({ text: '', isError: false });

  const canInvite = currentUser?.role === 'elderly' || currentUser?.role === 'caretaker';

  const handleJoinByPasscode = async (e) => {
    e.preventDefault();
    setJoinMessage({ text: '', isError: false });

    if (!joinPasscode.trim()) {
      setJoinMessage({ text: 'Please enter a 6-character passcode.', isError: true });
      return;
    }

    try {
      setJoinLoading(true);
      const res = await api.post('/invitations/verify-and-join', {
        passcode: joinPasscode.trim(),
      });
      setJoinMessage({ text: res.message || 'Successfully joined care team!', isError: false });
      setJoinPasscode('');
      await fetchProfiles();
    } catch (err) {
      setJoinMessage({ text: err.message, isError: true });
    } finally {
      setJoinLoading(false);
    }
  };

  const handleRemoveMember = async (memberUserId, memberName) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${memberName}?`)) return;
    try {
      await api.delete(`/profiles/${activeProfile?.id}/members/${memberUserId}`);
      await fetchProfiles();
    } catch (err) {
      alert(err.message);
    }
  };

  const members = activeProfile?.authorizedMembers || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Care Team & Shared Access</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
              {members.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorized caregivers and family members for {activeProfile?.fullName || 'Senior'}
          </p>
        </div>

        {canInvite && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-900 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-900/10 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Generate Invitation Passcode</span>
          </button>
        )}
      </div>

      {/* Join with Passcode Section (For New Members) */}
      <div className="bg-gradient-to-br from-blue-50/80 to-teal-50/40 p-6 rounded-2xl border border-blue-200 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Have a Caregiver Invitation Passcode?</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Enter the 6-character passcode provided by the senior's family or primary nurse to link your account.
            </p>

            <form onSubmit={handleJoinByPasscode} className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="e.g. CR7-9B2"
                maxLength={8}
                value={joinPasscode}
                onChange={(e) => setJoinPasscode(e.target.value.toUpperCase())}
                className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none w-44 bg-white"
              />
              <button
                type="submit"
                disabled={joinLoading}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                {joinLoading ? 'Verifying...' : 'Verify & Join Care Team'}
              </button>
            </form>

            {joinMessage.text && (
              <div className={`mt-2 text-xs flex items-center gap-1.5 font-semibold ${joinMessage.isError ? 'text-red-600' : 'text-emerald-700'}`}>
                {joinMessage.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{joinMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Authorized Members List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Authorized Ecosystem Members</h3>

        <div className="divide-y divide-slate-100">
          {members.map((member, idx) => {
            const isCaretaker = member.role === 'caretaker';
            const isFamily = member.role === 'family';

            return (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold">
                    {isCaretaker ? '👩‍⚕️' : '👨‍👦'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{member.name}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        isCaretaker ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Joined: {new Date(member.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {canInvite && member.userId !== currentUser?.uid && (
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    title="Revoke access"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Revoke Access</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Info Card */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary-900 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-900">Enterprise Healthcare Privacy Controls</p>
          <p className="mt-0.5 leading-relaxed text-slate-500">
            CareSync uses server-side passcode hashing via bcrypt with 72-hour expiration and 5-attempt rate limiting. Passcodes are single-use by default and instantly burned once verified.
          </p>
        </div>
      </div>

      {/* Modal */}
      <InviteMemberModal
        profileId={activeProfile?.id || 'demo-profile-robert'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProfiles}
      />
    </div>
  );
}
