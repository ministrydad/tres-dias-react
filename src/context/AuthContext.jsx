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
  const isRefreshLogoutRef = useRef(false);

  // Detect browser refresh and force logout
  useEffect(() => {
    const navigationEntries = performance.getEntriesByType('navigation');
    const isPageRefresh = navigationEntries.length > 0 && 
                          navigationEntries[0].type === 'reload';
    
    if (isPageRefresh) {
      console.log('🔄 Browser refresh detected - logging out and clearing session');
      isRefreshLogoutRef.current = true;
      setUser(null);
      setOrgId(null);
      setPermissions(null);
      setIsSuperAdmin(false);
      localStorage.clear();  // Clear ALL localStorage including stale session
      supabase.auth.signOut();
      setLoading(false);
      return;
    }
  }, []);

  useEffect(() => {
    // Only skip the INITIAL session check if we just logged out from refresh
    // But ALWAYS set up the auth listener and interval
    if (!isRefreshLogoutRef.current) {
      // Check for existing session on mount (only if not a refresh logout)
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('📋 Session check result:', session ? 'Session found' : 'No session');
        setUser(session?.user ?? null);
        if (session?.user) {
          initializeUser(session.user);
        } else {
          setLoading(false);
        }
      });
    } else {
      console.log('⏭️ Skipping initial session check after refresh logout (listener still active)');
    }

    // TEMPORARY WORKAROUND: Manually refresh session every 90 seconds
    const refreshInterval = setInterval(async () => {
      console.log('⏰ Manually refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('❌ Session refresh failed:', error);
      } else {
        console.log('✅ Session refreshed successfully');
      }
    }, 90000);

    // ALWAYS set up auth state change listener (even after refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event);
        
        // Ignore SIGNED_OUT event if it's from our refresh logout
        if (event === 'SIGNED_OUT' && isRefreshLogoutRef.current) {
          console.log('⏭️ Ignoring SIGNED_OUT from refresh logout');
          return;
        }
        
        // Ignore USER_UPDATED and TOKEN_REFRESHED events
        if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          console.log('⏭️ Ignoring', event, 'event - no re-initialization needed');
          return;
        }
        
        // If user is already initialized and this is a SIGNED_IN event, ignore it
        if (event === 'SIGNED_IN' && isInitializedRef.current) {
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
          isInitializedRef.current = false;
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const initializeUser = async (authUser) => {
    // Set flag IMMEDIATELY to prevent duplicate calls during async work
    if (isInitializedRef.current) {
      console.log('⏭️ Already initializing/initialized, skipping...');
      return;
    }
    isInitializedRef.current = true;
    
    console.log('🔧 Starting user initialization for:', authUser.email);
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Initialization timeout after 10 seconds')), 10000);
    });
    
    try {
      console.log('🔍 Step 1: Fetching memberships...');
      
      // Race between actual query and timeout
      const { data, error } = await Promise.race([
        supabase
          .from('memberships')
          .select('org_id, permissions, profiles!inner(full_name, display_name, email)')
          .eq('user_id', authUser.id),
        timeoutPromise
      ]);
      
      console.log('📦 Step 1 result:', data ? `Found ${data.length} membership(s)` : 'No data');
      
      if (error) {
        console.error('❌ Memberships query error:', error);
        throw error;
      }
      
      // If no memberships found
      if (!data || data.length === 0) {
        console.error('❌ No memberships found for user');
        throw new Error('No organization membership found for this user.');
      }
      
      // If multiple memberships, use the first one
      const membership = data[0];
      console.log('✅ Using membership for org_id:', membership.org_id);
      
      setOrgId(membership.org_id);
      setPermissions(membership.permissions || {});
      
      // Check for Super Admin
      if (membership.profiles?.full_name === 'Super Admin') {
        console.log('👑 Super Admin detected. Enabling admin panel.');
        setIsSuperAdmin(true);
      }
      
      console.log('🔍 Step 2: Fetching organization details...');
      
      // Fetch organization details with timeout
      const { data: orgData, error: orgError } = await Promise.race([
        supabase
          .from('organizations')
          .select('id, name')
          .eq('id', membership.org_id)
          .single(),
        timeoutPromise
      ]);
      
      console.log('📦 Step 2 result:', orgData ? `Org: ${orgData.name}` : 'No org data');
      
      if (orgError) {
        console.warn('⚠️ Failed to fetch organization (continuing anyway):', orgError);
      }
      
      console.log('🔧 Step 3: Setting user state...');
      
     setUser({
  ...authUser,
  full_name: membership.profiles?.full_name,
  display_name: membership.profiles?.display_name,
  email: membership.profiles?.email || authUser.email,
  role: membership.role,  // ← ADD THIS LINE
  organization: {
    id: membership.org_id,
    name: orgData?.name || 'Team Tools Pro'
  }
});
      
      console.log('✅ User initialization complete');
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Failed to initialize user:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      setIsSuperAdmin(false);
      isInitializedRef.current = false;
      setLoading(false); // CRITICAL: Stop loading even on error
      
      // Sign out the user if initialization fails
      console.log('🚪 Signing out due to initialization failure...');
      await supabase.auth.signOut();
    }
  };

  const login = async (email, password) => {
    console.log('🔑 Login attempt - resetting refresh flag');
    isRefreshLogoutRef.current = false;
    isInitializedRef.current = false; // Also reset initialization flag
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signup = async (email, password, fullName, orgName) => {
    isRefreshLogoutRef.current = false;
    isInitializedRef.current = false;
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