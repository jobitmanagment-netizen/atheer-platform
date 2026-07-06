import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { firebaseAuth } from '@/api/firebase';
import { navigateTo } from '@/lib/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    return firebaseAuth.login(email, password);
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    return firebaseAuth.register(email, password, displayName);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    return firebaseAuth.loginWithGoogle();
  }, []);

  const logout = useCallback(async () => {
    await firebaseAuth.logout();
    setUser(null);
    navigateTo('/login');
  }, []);

  const navigateToLogin = useCallback(() => {
    navigateTo('/login');
  }, []);

  const checkUserAuth = useCallback(() => {
    return !!firebaseAuth.getCurrentUser() || !!user;
  }, [user]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    // Compatibility aliases consumed across the app (ProtectedRoute / App shell)
    isLoadingAuth: loading,
    authChecked: !loading,
    authError: null,
    login,
    register,
    loginWithGoogle,
    logout,
    navigateToLogin,
    checkUserAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
