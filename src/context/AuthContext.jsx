// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        initializeUser(session.user);
      }
      setLoading(false);
    });

    // ✅ FIXED: Properly handle all auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event); // Debug logging
        
        // ✅ Handle different events appropriately
        if (event === 'SIGNED_IN') {
          console.log('✅ User signed in');
          setUser(session?.user ?? null);
          if (session?.user) {
            await initializeUser(session.user);
          }
        } 
        else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUser(null);
          setOrgId(null);
          setPermissions(null);
          setIsSuperAdmin(false);
        } 
        else if (event === 'TOKEN_REFRESHED') {
          // ✅ CRITICAL: Just update the user object, DON'T re-query database
          console.log('🔄 Token refreshed - keeping existing org/permissions');
          setUser(session?.user ?? null);
          // Don't call initializeUser() - we already have orgId and permissions!
        }
        else if (event === 'USER_UPDATED') {
          console.log('📝 User updated');
          setUser(session?.user ?? null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeUser = async (authUser) => {
    try {
      console.log('🔍 Initializing user:', authUser.email);
      
      const { data, error } = await supabase
        .from('memberships')
        .select('org_id, permissions, profiles!inner(full_name, display_name, email)')
        .eq('user_id', authUser.id)
        .single();

      if (error) {
        console.error('❌ Failed to fetch membership:', error);
        throw error;
      }

      console.log('✅ User initialized - Org ID:', data.org_id);
      
      setOrgId(data.org_id);
      setPermissions(data.permissions);

      // Check if user is Super Admin
      const profile = data.profiles;
      if (profile?.full_name === 'Super Admin') {
        setIsSuperAdmin(true);
        console.log('👑 Super Admin detected');
      } else {
        setIsSuperAdmin(false);
      }

      // Set user with profile data for sidebar display
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name,
        display_name: profile?.display_name,
      });

    } catch (error) {
      console.error('❌ Failed to initialize user:', error);
      setIsSuperAdmin(false);
      // Don't throw - allow app to continue with limited functionality
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
