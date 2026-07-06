import { createClient } from '@supabase/supabase-js';

const MOCK_TOKEN = 'mock-session-token-12345';

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return { url, key, isConfigured: !!(url && key) };
}

export async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const { url, key, isConfigured } = getSupabaseConfig();

  // 1. If Supabase IS configured, try real JWT validation first
  if (isConfigured) {
    try {
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        // Valid Supabase JWT — verify admin role
        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (adminRow) {
          return { ...user, role: adminRow.role };
        }
      }
    } catch (err) {
      console.warn('Supabase auth validation failed, checking fallback:', err.message);
    }
  }

  // 2. Fallback: accept the mock token for JSON-based CMS mode
  //    This allows the admin to work even when Supabase Auth is not set up,
  //    or when the frontend used the /api/login mock endpoint.
  if (token === MOCK_TOKEN) {
    return {
      id: 'mock-admin-id',
      email: 'admin@intellectcircle.com',
      role: 'admin'
    };
  }

  return null;
}

export async function logActivity(userEmail, action, details) {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return; // Silently skip logging when Supabase is not available

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    await supabase.from('activity_logs').insert({
      user_email: userEmail || 'system',
      action,
      details
    });
  } catch (err) {
    console.warn('Activity logging failed:', err.message);
  }
}
