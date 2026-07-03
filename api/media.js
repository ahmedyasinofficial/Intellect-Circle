import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, logActivity } from './auth-middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Read media items is public
  if (req.method === 'GET') {
    try {
      const { search } = req.query;
      let query = supabase.from('media_library').select('*').order('created_at', { ascending: false });
      
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
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
      const { name, url, size, mime_type } = req.body;
      if (!name || !url) {
        return res.status(400).json({ error: 'Name and URL are required.' });
      }

      const { data, error } = await supabase.from('media_library').insert({
        name,
        url,
        size,
        mime_type
      }).select().single();

      if (error) throw error;

      await logActivity(user.email, 'Add Media Asset', `Uploaded media item: ${name}`);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing media ID.' });
      }

      // Fetch the item first to get filename and URL
      const { data: mediaItem } = await supabase.from('media_library').select('*').eq('id', id).single();
      if (!mediaItem) {
        return res.status(404).json({ error: 'Media asset not found.' });
      }

      // 1. Delete from public.media_library database table
      await supabase.from('media_library').delete().eq('id', id);

      // 2. Try deleting from storage bucket if it's a Supabase storage URL
      if (mediaItem.url.includes('/storage/v1/object/public/media/')) {
        const fileName = mediaItem.url.split('/storage/v1/object/public/media/')[1];
        if (fileName) {
          await supabase.storage.from('media').remove([fileName]);
        }
      }

      await logActivity(user.email, 'Delete Media Asset', `Removed media item: ${mediaItem.name}`);
      return res.status(200).json({ success: true, message: 'Media asset deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Media Library CRUD failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
