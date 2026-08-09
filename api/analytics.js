import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getAuthenticatedUser } from '../lib/_auth-middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action: queryAction } = req.query || {};
  const url = req.url || '';

  // 1. Handle Activity Log Requests (/api/activity-log or query action=activity-log)
  if (queryAction === 'activity-log' || url.includes('/api/activity-log')) {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Authenticate admin user
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

    if (!supabaseUrl || !supabaseKey) {
      if (req.method === 'GET') {
        const { readFileSync } = await import('fs');
        const { join, dirname } = await import('path');
        const { fileURLToPath } = await import('url');
        try {
          const defaultData = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.json'), 'utf-8'));
          return res.status(200).json(defaultData.activity_logs || []);
        } catch (e) {
          return res.status(200).json([]);
        }
      }
      return res.status(200).json({ success: true, data: { id: `log-${Date.now()}`, ...req.body, created_at: new Date().toISOString() } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    try {
      if (req.method === 'GET') {
        const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        return res.status(200).json(data);
      }
      
      if (req.method === 'POST') {
        const { action, details } = req.body || {};
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

  // 2. Handle standard Analytics Requests
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseActive = !!(supabaseUrl && supabaseKey);

  if (req.method === 'POST') {
    const { path, referrer } = req.body || {};
    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || '';
    const visitorId = crypto.createHash('sha256').update(`${ip}-${ua}`).digest('hex');

    if (!isSupabaseActive) {
      return res.status(200).json({ success: true, message: 'Analytics logged (mocked)' });
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { error } = await supabase.from('analytics_events').insert({
        visitor_id: visitorId,
        page_path: path,
        referrer: referrer || '',
        user_agent: ua
      });

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[Analytics API] Log error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    if (!isSupabaseActive) {
      const mockDays = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        mockDays.push({
          date: d.toLocaleDateString('en-US', { weekday: 'short' }),
          views: Math.floor(Math.random() * 80) + 20
        });
      }
      return res.status(200).json({
        pageViews: 1240,
        uniqueVisitors: 412,
        chartData: mockDays
      });
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

      const { data: allEvents, error: fetchError } = await supabase
        .from('analytics_events')
        .select('visitor_id, created_at');

      if (fetchError) throw fetchError;

      const pageViews = allEvents.length;
      const uniqueVisitors = new Set(allEvents.map(e => e.visitor_id)).size;

      const now = new Date();
      const daysMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateString = d.toDateString();
        daysMap[dateString] = { label: dayLabel, count: 0 };
      }

      allEvents.forEach(event => {
        const eventDate = new Date(event.created_at).toDateString();
        if (daysMap[eventDate] !== undefined) {
          daysMap[eventDate].count++;
        }
      });

      const chartData = Object.keys(daysMap).map(key => ({
        date: daysMap[key].label,
        views: daysMap[key].count
      }));

      return res.status(200).json({
        pageViews,
        uniqueVisitors,
        chartData
      });
    } catch (err) {
      console.error('[Analytics API] Fetch error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
