// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'tres-dias-team-tools',
    },
  },
  db: {
    schema: 'public',
  },
});

// ❌ REMOVED: Auth event listener - this is handled in AuthContext.jsx
// Only AuthContext should listen to auth events to avoid duplicates

export async function logErrorToSupabase(error, module, orgId = null) {
  if (!supabase || !orgId) {
    console.error("Cannot log error - missing supabase or orgId");
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const logData = {
      org_id: orgId,
      user_id: user?.id || null,
      user_email: user?.email || 'unknown',
      module: module,
      error_message: error.message,
      stack_trace: error.stack || null
    };
    await supabase.from('error_logs').insert(logData);
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError.message);
  }
}