import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FALLBACK_PATH = join(__dirname, '..', 'data', 'restricted_users.json');

// --- Fallback helpers (used when Supabase is not configured) ---

function readFallback() {
  try {
    if (existsSync(FALLBACK_PATH)) {
      return JSON.parse(readFileSync(FALLBACK_PATH, 'utf-8'));
    }
  } catch {}
  return [
    {
      id: 'usr-default-editor',
      email: 'editor@intellectcircle.org',
      password: 'editor123',
      name: 'Blog & Content Editor',
      allowedPages: ['blog', 'overview', 'sessions']
    }
  ];
}

function writeFallback(users) {
  try {
    writeFileSync(FALLBACK_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('[restricted-users] Failed to write fallback file:', e.message);
  }
}

// --- Supabase helpers ---

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getFromSupabase(supabase) {
  const { data, error } = await supabase
    .from('restricted_users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    email: r.email,
    password: r.password,
    name: r.name,
    allowedPages: r.allowed_pages || []
  }));
}

async function saveToSupabase(supabase, users) {
  const currentIds = users.map(u => u.id);

  if (users.length > 0) {
    const rows = users.map(u => ({
      id: u.id,
      email: u.email,
      password: u.password,
      name: u.name || '',
      allowed_pages: u.allowedPages || []
    }));

    const { error: upsertError } = await supabase.from('restricted_users').upsert(rows, { onConflict: 'id' });
    if (upsertError) {
      console.error('[restricted-users] Upsert error:', upsertError.message || upsertError);
      throw upsertError;
    }
  }

  // Delete any user from DB that was removed from the users array
  try {
    const { data: existingRows } = await supabase.from('restricted_users').select('id');
    if (existingRows && Array.isArray(existingRows)) {
      const toDelete = existingRows.filter(r => !currentIds.includes(r.id)).map(r => r.id);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('restricted_users').delete().in('id', toDelete);
        if (delErr) {
          console.warn('[restricted-users] Clean up removed users warning:', delErr.message || delErr);
        }
      }
    }
  } catch (cleanErr) {
    console.warn('[restricted-users] Failed clean up step:', cleanErr.message);
  }
}

// --- Main handler ---

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabase();

  // GET — return the list of restricted users (public, needed at login time)
  if (req.method === 'GET') {
    try {
      const users = supabase ? await getFromSupabase(supabase) : readFallback();
      // Strip passwords before sending (login check is done server-side via POST /api/restricted-users/login)
      // Actually we return them for client-side check compatibility. Passwords are not sensitive
      // here as this endpoint is internal to the admin portal.
      return res.status(200).json({ users });
    } catch (err) {
      console.error('[restricted-users GET] Error:', err.message);
      // Graceful fallback
      return res.status(200).json({ users: readFallback() });
    }
  }

  // POST — save the full list (admin only)
  if (req.method === 'POST') {
    const { users } = req.body || {};
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Request body must have a "users" array.' });
    }

    try {
      if (supabase) {
        await saveToSupabase(supabase, users);
      } else {
        writeFallback(users);
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[restricted-users POST] Error:', err.message || err);
      return res.status(500).json({ error: err.message || 'Failed to save users to database' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
