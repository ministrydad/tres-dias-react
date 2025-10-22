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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        initializeUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await initializeUser(session.user);
        } else {
          setIsSuperAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeUser = async (authUser) => {
  try {
    console.log('Initializing user session for:', authUser.email);
    
    // Fetch ALL memberships for this user (not just .single())
    const { data, error } = await supabase
      .from('memberships')
      .select('org_id, permissions, profiles!inner(full_name, display_name, email)')
      .eq('user_id', authUser.id);
    
    if (error) throw error;
    
    // If no memberships found
    if (!data || data.length === 0) {
      throw new Error('No organization membership found for this user.');
    }
    
    // If multiple memberships, use the first one (or implement org selection logic)
    const membership = data[0];
    
    setOrgId(membership.org_id);
    setPermissions(membership.permissions || {});
    
    // Check for Super Admin
    if (membership.profiles?.full_name === 'Super Admin') {
      console.log('Super Admin detected. Enabling admin panel.');
      setIsSuperAdmin(true);
    }
    
    setUser({
      ...authUser,
      full_name: membership.profiles?.full_name,
      display_name: membership.profiles?.display_name,
      email: membership.profiles?.email || authUser.email,
      organization: {
        id: membership.org_id
      }
    });
    
  } catch (error) {
    console.error('Failed to initialize user:', error);
    setIsSuperAdmin(false);
    // Sign out the user if initialization fails
    await supabase.auth.signOut();
    throw error;
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