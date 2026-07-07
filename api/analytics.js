import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  // Fallback mock data when Supabase is not configured (e.g. initial dev or missing environment)
  const isSupabaseActive = !!(supabaseUrl && supabaseKey);

  if (req.method === 'POST') {
    const { path, referrer } = req.body || {};
    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || '';
    // Generate secure hashed visitor ID (cookieless & private)
    const visitorId = crypto.createHash('sha256').update(`${ip}-${ua}`).digest('hex');

    if (!isSupabaseActive) {
      // In development or when unconfigured, return mock success
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
      // Return beautiful mock historical statistics for dev visualization
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

      // 1. Fetch total page views and unique visitors
      const { data: allEvents, error: fetchError } = await supabase
        .from('analytics_events')
        .select('visitor_id, created_at');

      if (fetchError) throw fetchError;

      const pageViews = allEvents.length;
      const uniqueVisitors = new Set(allEvents.map(e => e.visitor_id)).size;

      // 2. Compute last 7 days daily breakdown
      const last7Days = [];
      const now = new Date();
      
      // Initialize days dictionary
      const daysMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateString = d.toDateString();
        daysMap[dateString] = { label: dayLabel, count: 0 };
      }

      // Group events by day
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

  return res.status(405).json({ error: 'Method not allowed' });
}
