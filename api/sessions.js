import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, logActivity } from './auth-middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Read methods (GET) are public
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('sessions').select('*').order('scheduled_at', { ascending: false });
      if (error) throw error;
      
      // Auto status update check
      const now = new Date();
      const updatedData = data.map(s => {
        if (s.status === 'upcoming' && new Date(s.scheduled_at) < now) {
          s.status = 'completed';
        }
        return s;
      });
      
      return res.status(200).json(updatedData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Modifying methods require admin authentication
  let user;
  try {
    user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized admin user session required.' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    if (req.method === 'POST') {
      const { title, presenter, scheduled_at, time, format, summary, status, photo, takeaways, registration_link } = req.body;
      if (!title || !presenter || !scheduled_at) {
        return res.status(400).json({ error: 'Title, Presenter, and Scheduled Date are required.' });
      }

      // Automatically determine status if not provided or if upcoming but scheduled in past
      let computedStatus = status || 'upcoming';
      if (computedStatus === 'upcoming' && new Date(scheduled_at) < new Date()) {
        computedStatus = 'completed';
      }

      const { data, error } = await supabase.from('sessions').insert({
        title,
        presenter,
        scheduled_at,
        time,
        format,
        summary,
        status: computedStatus,
        photo,
        takeaways: takeaways || [],
        registration_link
      }).select().single();

      if (error) throw error;

      await logActivity(user.email, 'Create Session', `Scheduled session: ${title} by ${presenter}`);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const { id, title, presenter, scheduled_at, time, format, summary, status, photo, takeaways, registration_link } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing session ID.' });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (presenter !== undefined) updateData.presenter = presenter;
      if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
      if (time !== undefined) updateData.time = time;
      if (format !== undefined) updateData.format = format;
      if (summary !== undefined) updateData.summary = summary;
      if (photo !== undefined) updateData.photo = photo;
      if (takeaways !== undefined) updateData.takeaways = takeaways;
      if (registration_link !== undefined) updateData.registration_link = registration_link;

      if (status !== undefined) {
        let computedStatus = status;
        const targetDate = scheduled_at || req.body.scheduledAt;
        if (computedStatus === 'upcoming' && targetDate && new Date(targetDate) < new Date()) {
          computedStatus = 'completed';
        }
        updateData.status = computedStatus;
      }

      const { data, error } = await supabase.from('sessions').update(updateData).eq('id', id).select().single();
      if (error) throw error;

      await logActivity(user.email, 'Update Session', `Updated session: ${data.title}`);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing session ID.' });
      }

      const { data: session } = await supabase.from('sessions').select('title').eq('id', id).single();

      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;

      await logActivity(user.email, 'Delete Session', `Removed session: ${session?.title || id}`);
      return res.status(200).json({ success: true, message: 'Session deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Session CRUD failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
