// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const isInitializedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    initializeUser(session.user);
  }
  setLoading(false);  // ← ALWAYS set loading false after checking session
});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event);
        
        if (event === 'SIGNED_IN') {
          console.log('✅ User signed in');
          if (session?.user && !isInitializedRef.current) {
            await initializeUser(session.user);
          } else if (isInitializedRef.current) {
            console.log('⏭️ Already initialized - skipping duplicate init');
          }
        } 
        else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUser(null);
          setOrgId(null);
          setPermissions(null);
          setIsSuperAdmin(false);
          setLoading(false);
          isInitializedRef.current = false;
        }
        else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed - keeping existing user/org/permissions');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeUser = async (authUser) => {
  try {
    console.log('🔍 Initializing user:', authUser.email);
    
    // Force a fresh session token before querying
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data, error } = await supabase
      .from('memberships')
      .select('org_id, permissions, profiles!inner(full_name, display_name, email)')
      .eq('user_id', authUser.id)
      .single();

    if (error) throw error;

      console.log('✅ User initialized - Org ID:', data.org_id);
      
      setOrgId(data.org_id);
      setPermissions(data.permissions);

      const profile = data.profiles;
      if (profile?.full_name === 'Super Admin') {
        setIsSuperAdmin(true);
        console.log('👑 Super Admin detected');
      } else {
        setIsSuperAdmin(false);
      }

      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name,
        display_name: profile?.display_name,
      });

      isInitializedRef.current = true;
      setLoading(false);

    } catch (error) {
      console.error('❌ Failed to initialize user:', error);
      setIsSuperAdmin(false);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signup = async (email, password, fullName, orgName) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
      email, 
      password 
    });
    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error('Sign up failed');

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName, created_by: user.id })
      .select()
      .single();
    if (orgError) throw orgError;

    await supabase.from('profiles').insert({ 
      user_id: user.id, 
      full_name: fullName, 
      email: user.email 
    });

    await supabase.from('memberships').insert({ 
      user_id: user.id, 
      org_id: orgData.id, 
      role: 'owner' 
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setOrgId(null);
    setPermissions(null);
    setIsSuperAdmin(false);
    isInitializedRef.current = false;
  };

  const value = {
    user,
    loading,
    orgId,
    permissions,
    isSuperAdmin,
    login,
    signup,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}