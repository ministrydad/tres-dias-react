import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtubjrksomudwjdhgmss.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dWJqcmtzb211ZHdqZGhnbXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTE2MjQsImV4cCI6MjA3MDYyNzYyNH0.JSKNAJacNaf3jZqDvm1Q5lWMlzjfQ4kjO9mmTS3w1vk';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: true,
  },
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