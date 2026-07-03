import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from './auth-middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Authenticate admin user
  let user;
  try {
    user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized admin user session required.' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    if (req.method === 'POST') {
      const { action, details } = req.body;
      if (!action) {
        return res.status(400).json({ error: 'Missing action label.' });
      }
      
      const { data, error } = await supabase.from('activity_logs').insert({
        user_email: user.email,
        action,
        details: details || ''
      }).select().single();
      
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }
  } catch (error) {
    console.error('Error in activity log endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
}
