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
      const { data, error } = await supabase.from('blog').select('*').order('published_at', { ascending: false });
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
      const { title, published_at, author, excerpt, content } = req.body;
      if (!title || !author) {
        return res.status(400).json({ error: 'Title and Author are required.' });
      }

      const { data, error } = await supabase.from('blog').insert({
        title,
        published_at: published_at || new Date().toISOString(),
        author,
        excerpt,
        content
      }).select().single();

      if (error) throw error;

      await logActivity(user.email, 'Create Blog Recap', `Published recap: ${title}`);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const { id, title, published_at, author, excerpt, content } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing blog recap ID.' });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (published_at !== undefined) updateData.published_at = published_at;
      if (author !== undefined) updateData.author = author;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (content !== undefined) updateData.content = content;

      const { data, error } = await supabase.from('blog').update(updateData).eq('id', id).select().single();
      if (error) throw error;

      await logActivity(user.email, 'Update Blog Recap', `Updated recap: ${data.title}`);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing blog ID.' });
      }

      const { data: blogPost } = await supabase.from('blog').select('title').eq('id', id).single();

      const { error } = await supabase.from('blog').delete().eq('id', id);
      if (error) throw error;

      await logActivity(user.email, 'Delete Blog Recap', `Removed recap: ${blogPost?.title || id}`);
      return res.status(200).json({ success: true, message: 'Recap deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Blog Recap CRUD failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
