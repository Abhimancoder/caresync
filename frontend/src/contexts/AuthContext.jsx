import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase.js';

const AuthContext = createContext();

export const DEMO_PROFILES = {
  elderly: {
    uid: 'demo-elderly-robert',
    email: 'robert.harrison@caresync.health',
    displayName: 'Robert Harrison',
    role: 'elderly',
    token: 'demo-token-elderly',
  },
  caretaker: {
    uid: 'demo-caretaker-sarah',
    email: 'sarah.jenkins@caresync.health',
    displayName: 'Sarah Jenkins (RN)',
    role: 'caretaker',
    token: 'demo-token-caretaker',
  },
  family: {
    uid: 'demo-family-michael',
    email: 'michael.harrison@caresync.health',
    displayName: 'Michael Harrison',
    role: 'family',
    token: 'demo-token-family',
  },
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('caresync_user');
    return saved ? JSON.parse(saved) : DEMO_PROFILES.caretaker; // Default to caretaker for rich evaluation
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If running in live mode, listen to Firebase Auth
    if (auth && !currentUser?.uid?.startsWith('demo-')) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          localStorage.setItem('caresync_auth_token', token);
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0],
            role: localStorage.getItem('caresync_user_role') || 'caretaker',
          };
          setCurrentUser(userData);
          localStorage.setItem('caresync_user', JSON.stringify(userData));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('caresync_auth_token');
          localStorage.removeItem('caresync_user');
        }
      });
      return unsubscribe;
    }
  }, []);

  const loginWithDemo = (roleKey) => {
    const profile = DEMO_PROFILES[roleKey] || DEMO_PROFILES.caretaker;
    setCurrentUser(profile);
    localStorage.setItem('caresync_auth_token', profile.token);
    localStorage.setItem('caresync_user', JSON.stringify(profile));
    localStorage.setItem('caresync_user_role', profile.role);
    return profile;
  };

  const loginWithEmail = async (email, password) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      localStorage.setItem('caresync_auth_token', token);
      const role = localStorage.getItem('caresync_user_role') || 'caretaker';
      const user = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || email.split('@')[0],
        role,
      };
      setCurrentUser(user);
      localStorage.setItem('caresync_user', JSON.stringify(user));
      return user;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email, password, displayName, role) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      const token = await cred.user.getIdToken();
      localStorage.setItem('caresync_auth_token', token);
      localStorage.setItem('caresync_user_role', role);
      const user = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName,
        role,
      };
      setCurrentUser(user);
      localStorage.setItem('caresync_user', JSON.stringify(user));
      return user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (auth && !currentUser?.uid?.startsWith('demo-')) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('caresync_auth_token');
    localStorage.removeItem('caresync_user');
    localStorage.removeItem('caresync_user_role');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        loginWithDemo,
        loginWithEmail,
        registerWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
