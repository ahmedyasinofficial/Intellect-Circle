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
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceRoleKey = !!key;
  
  console.log('[Auth Middleware Debug] process.env.SUPABASE_URL:', url);
  console.log('[Auth Middleware Debug] process.env.SUPABASE_SERVICE_ROLE_KEY exists:', hasServiceRoleKey);

  // Decode JWT payload to check issuer
  try {
    const payloadBase64 = token.split('.')[1];
    if (payloadBase64) {
      const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      console.log('[Auth Middleware Debug] JWT iss claim:', decodedPayload.iss);
      const isIssuerMatch = url && decodedPayload.iss && decodedPayload.iss.startsWith(url);
      console.log('[Auth Middleware Debug] Does iss match SUPABASE_URL?', !!isIssuerMatch);
    }
  } catch (e) {
    console.warn('[Auth Middleware Debug] Failed to decode JWT payload:', e.message);
  }

  if (!url || !key) {
    console.error('[Auth Middleware Debug] Missing Supabase env variables.');
    return null;
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Use token directly with Supabase client to get the user
    // In v2, getUser(jwt) takes the token directly, or we can use setSession
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('[Auth Middleware Debug] supabase.auth.getUser(token) error:', JSON.stringify(error));
    }

    if (error || !user) {
      return null;
    }

    // Valid Supabase JWT — verify admin role
    const { data: adminRow, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminRow) {
      console.warn(`[Auth Middleware] User ${user.id} (${user.email}) is not in admin_users table or query failed:`, adminError?.message);
      return null;
    }

    console.log(`[Auth Middleware] Successfully authenticated admin: ${user.email}`);
    return { ...user, role: adminRow.role };

  } catch (err) {
    console.error('[Auth Middleware Debug] Unexpected error during Supabase auth validation:', err.message);
    return null;
  }
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
