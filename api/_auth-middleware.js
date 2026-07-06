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
    console.warn('[Auth Middleware] Missing or malformed Authorization header:', authHeader);
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

      if (error || !user) {
        console.warn('[Auth Middleware] Supabase JWT validation failed:', error?.message || 'No user returned');
      } else {
        // Valid Supabase JWT — verify admin role
        const { data: adminRow, error: adminError } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (adminError || !adminRow) {
          console.warn(`[Auth Middleware] User ${user.id} (${user.email}) is not in admin_users table or query failed:`, adminError?.message);
        } else {
          console.log(`[Auth Middleware] Successfully authenticated admin: ${user.email}`);
          return { ...user, role: adminRow.role };
        }
      }
    } catch (err) {
      console.error('[Auth Middleware] Unexpected error during Supabase auth validation:', err.message);
    }
  } else {
    console.warn('[Auth Middleware] Supabase is NOT configured on the server. SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  }

  // 2. Fallback: accept the mock token for JSON-based CMS mode
  if (token === MOCK_TOKEN) {
    console.log('[Auth Middleware] Falling back to mock session token.');
    return {
      id: 'mock-admin-id',
      email: 'admin@intellectcircle.com',
      role: 'admin'
    };
  } else {
    console.warn('[Auth Middleware] Token is not a valid Supabase JWT and does not match MOCK_TOKEN.');
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
