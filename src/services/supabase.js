// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
}

// Custom fetch that forces fresh connections
const customFetch = (url, options = {}) => {
  console.log('🌐 Custom fetch:', url);
  
  // Force connection: close header to prevent reuse
  const headers = {
    ...options.headers,
    'Connection': 'close',
  };
  
  // Create abort controller with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('⏱️ Fetch timeout after 8 seconds');
    controller.abort();
  }, 8000);
  
  return fetch(url, {
    ...options,
    headers,
    signal: controller.signal,
    keepalive: false,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};

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
    fetch: customFetch,
  },
  db: {
    schema: 'public',
  },
});

// Connection keepalive - ping every 2 minutes
let keepaliveInterval = null;

export function startKeepalive() {
  if (keepaliveInterval) return;
  
  console.log('🏓 Starting connection keepalive');
  pingDatabase();
  
  keepaliveInterval = setInterval(() => {
    pingDatabase();
  }, 120000); // 2 minutes
}

export function stopKeepalive() {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
    console.log('🛑 Stopped keepalive');
  }
}

async function pingDatabase() {
  try {
    console.log('🏓 Ping...');
    const { error } = await supabase.from('cra_applications').select('id').limit(1);
    if (error) {
      console.warn('⚠️ Ping failed:', error.message);
    } else {
      console.log('✅ Pong!');
    }
  } catch (err) {
    console.error('❌ Ping error:', err.message);
  }
}

// Auto-start/stop keepalive on auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 Auth event:', event);
  
  if (event === 'SIGNED_IN') {
    startKeepalive();
  }
  if (event === 'SIGNED_OUT') {
    stopKeepalive();
  }
  if (event === 'TOKEN_REFRESHED') {
    console.log('🔄 Token refreshed');
  }
});

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