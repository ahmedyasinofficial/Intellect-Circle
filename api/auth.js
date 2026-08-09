import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FALLBACK_PATH = join(__dirname, '..', 'data', 'restricted_users.json');

let adminEmail = 'admin@intellectcircle.com';
try {
  const dataPath = join(__dirname, '..', 'src', 'data.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  adminEmail = data.admin?.email || adminEmail;
} catch (e) {
  // Keep default
}

// --- Fallback helpers ---
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
    const emailMap = new Map();
    users.forEach(u => {
      if (u.email) {
        const lowerEmail = u.email.trim().toLowerCase();
        emailMap.set(lowerEmail, {
          id: u.id,
          email: u.email.trim(),
          password: u.password,
          name: u.name || '',
          allowed_pages: u.allowedPages || []
        });
      }
    });
    const rows = Array.from(emailMap.values());

    const { error: upsertError } = await supabase.from('restricted_users').upsert(rows, { onConflict: 'email' });
    if (upsertError) {
      console.error('[restricted-users] Upsert error:', upsertError.message || upsertError);
      throw upsertError;
    }
  }

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query || {};
  const url = req.url || '';

  // 1. Handle Login request (action === 'login' or path contains /api/login)
  if (action === 'login' || url.includes('/api/login')) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      if (email === adminEmail) {
        return res.status(200).json({
          success: true,
          session: { access_token: 'mock-session-token-12345' },
          user: { id: 'mock-admin-id', email }
        });
      } else {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    } catch (error) {
      console.error('Login API Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // 2. Handle Restricted Users management (GET / POST)
  const supabase = getSupabase();

  if (req.method === 'GET') {
    try {
      const users = supabase ? await getFromSupabase(supabase) : readFallback();
      return res.status(200).json({ users });
    } catch (err) {
      console.error('[restricted-users GET] Error:', err.message);
      return res.status(200).json({ users: readFallback() });
    }
  }

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
