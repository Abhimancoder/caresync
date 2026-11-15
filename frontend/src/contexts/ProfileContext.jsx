import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const ProfileContext = createContext();

export const DEFAULT_PROFILE = {
  id: 'demo-profile-robert',
  elderlyUserId: 'demo-elderly-robert',
  fullName: 'Robert Harrison',
  age: 78,
  dateOfBirth: '1948-06-12',
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Sulfa drugs'],
  emergencyContacts: [
    { name: 'Sarah Jenkins', relationship: 'Daughter / Nurse & Primary Caregiver', phone: '+1-555-0199', isPrimary: true },
    { name: 'Michael Harrison', relationship: 'Son', phone: '+1-555-0144', isPrimary: false },
  ],
  authorizedMembers: [
    { userId: 'demo-caretaker-sarah', name: 'Sarah Jenkins', role: 'caretaker', joinedAt: '2026-11-15T08:00:00Z' },
    { userId: 'demo-family-michael', name: 'Michael Harrison', role: 'family', joinedAt: '2026-11-15T09:00:00Z' },
  ],
  medicalNotes: 'Diagnosed with mild hypertension and type 2 diabetes. Daily morning Lisinopril and evening Metformin.',
};

export function ProfileProvider({ children }) {
  const { currentUser } = useAuth();
  const [activeProfile, setActiveProfile] = useState(DEFAULT_PROFILE);
  const [profiles, setProfiles] = useState([DEFAULT_PROFILE]);
  const [loading, setLoading] = useState(false);

  const fetchProfiles = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await api.get('/profiles');
      if (res.data && res.data.length > 0) {
        setProfiles(res.data);
        const currentStillExists = res.data.find(p => p.id === activeProfile?.id);
        if (currentStillExists) {
          setActiveProfile(currentStillExists);
        } else {
          setActiveProfile(res.data[0]);
        }
      }
    } catch (err) {
      console.warn('Using default demo profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [currentUser]);

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        setActiveProfile,
        profiles,
        fetchProfiles,
        loading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

export default ProfileContext;
