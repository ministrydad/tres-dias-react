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
  
  // Track if we've already initialized to prevent duplicate calls
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('📱 getSession called, session exists:', !!session);
      
      if (session?.user) {
        await initializeUser(session.user);
        isInitializedRef.current = true;
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only initialize if not already initialized (prevents duplicate on fresh login)
          if (!isInitializedRef.current) {
            await initializeUser(session.user);
            isInitializedRef.current = true;
          } else {
            console.log('⏭️ Already initialized - skipping');
          }
        } 
        else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUser(null);
          setOrgId(null);
          setPermissions(null);
          setIsSuperAdmin(false);
          isInitializedRef.current = false;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeUser = async (authUser) => {
    try {
      console.log('🔍 Step 1: Starting initializeUser for:', authUser.email);
      console.log('🔍 Step 2: authUser object:', authUser);
      
      console.log('🔍 Step 3: About to query memberships table...');

// Force session refresh before querying
console.log('🔍 Step 3.5: Refreshing session token...');
const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

if (refreshError) {
  console.log('❌ Step 3.6: Failed to refresh session:', refreshError);
} else {
  console.log('✅ Step 3.7: Session refreshed successfully');
}

const startTime = Date.now();

const { data, error } = await supabase
  .from('memberships')
        .select('org_id, permissions, profiles!inner(full_name, display_name, email)')
        .eq('user_id', authUser.id)
        .single();
      
      const endTime = Date.now();
      console.log(`🔍 Step 4: Query completed in ${endTime - startTime}ms`);

      if (error) {
        console.log('❌ Step 5: Query returned error:', error);
        throw error;
      }

      console.log('✅ Step 6: Query succeeded, data:', data);

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

      console.log('✅ Step 7: User fully initialized');

    } catch (error) {
      console.error('❌ Failed to initialize user:', error);
      setIsSuperAdmin(false);
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