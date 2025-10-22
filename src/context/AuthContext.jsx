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
  const [isInitialized, setIsInitialized] = useState(false);  // Track if user is already initialized

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        initializeUser(session.user);
      }
      setLoading(false);
    });

    // TEMPORARY WORKAROUND: Manually refresh session every 90 seconds
    const refreshInterval = setInterval(async () => {
      console.log('⏰ Manually refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('❌ Session refresh failed:', error);
      } else {
        console.log('✅ Session refreshed successfully');
      }
    }, 90000); // 90 seconds

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event);
        
        // Ignore USER_UPDATED and TOKEN_REFRESHED events
        // These don't require re-initialization since user is already authenticated
        if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          console.log('⏭️ Ignoring', event, 'event - no re-initialization needed');
          return;
        }
        
        // If user is already initialized and this is a SIGNED_IN event, ignore it
        if (event === 'SIGNED_IN' && isInitialized) {
          console.log('⏭️ User already initialized, ignoring duplicate SIGNED_IN event');
          return;
        }
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await initializeUser(session.user);
        } else {
          // User logged out - clear everything
          setOrgId(null);
          setPermissions(null);
          setIsSuperAdmin(false);
          setIsInitialized(false);  // Reset flag on logout
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
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
      
      // Fetch organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', membership.org_id)
        .single();
      
      if (orgError) {
        console.error('Failed to fetch organization:', orgError);
      }
      
      setUser({
        ...authUser,
        full_name: membership.profiles?.full_name,
        display_name: membership.profiles?.display_name,
        email: membership.profiles?.email || authUser.email,
        organization: {
          id: membership.org_id,
          name: orgData?.name || 'Team Tools Pro'
        }
      });
      
      setIsInitialized(true);  // Mark as initialized
      
    } catch (error) {
      console.error('Failed to initialize user:', error);
      setIsSuperAdmin(false);
      setIsInitialized(false);
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