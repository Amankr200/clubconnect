import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, getMe } from '../api/auth';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cc_token';

// Role metadata
export const ROLE_META = {
  admin: {
    label:       'Platform Admin',
    emoji:       '⚙️',
    color:       '#EF4444',
    description: 'Manage users, societies, venue settings, bug reports & live approvals',
  },
  student_coordinator: {
    label:       'Student Coordinator',
    emoji:       '🏛️',
    color:       '#F59E0B',
    description: 'Manage venue bookings, society events & publish 24h stories',
  },
  faculty_coordinator: {
    label:       'Faculty Coordinator',
    emoji:       '👨‍🏫',
    color:       '#10B981',
    description: 'Review events, edit society details, track performance & publish stories',
  },
  hod: {
    label:       'Head of Department (HOD)',
    emoji:       '🏫',
    color:       '#8B5CF6',
    description: 'Department event approval, coordinator assignments & department analytics',
  },
  principal_dean: {
    label:       'Principal / Dean',
    emoji:       '🎓',
    color:       '#3B82F6',
    description: 'Institutional final approvals and overall college & society analytics',
  },
};

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true); // true while validating stored token

  // On mount: validate stored token
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    getMe(stored)
      .then((userData) => {
        setUser(userData);
        setToken(stored);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * login(email, password)
   * Calls the backend, stores the JWT, sets user state.
   * Throws on bad credentials so the form can show an error.
   */
  const login = useCallback(async (email, password) => {
    const { token: newToken, user: userData } = await loginUser(email, password);
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  }, []);

  /**
   * logout()
   * Clears token from storage and resets state.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook: const { user, login, logout, loading } = useAuth(); */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
