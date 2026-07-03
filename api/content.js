import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, logActivity } from './_auth-middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type } = req.query;
  if (!type || !['team', 'sessions', 'blog'].includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing content type parameter.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // 1. GET requests are public
  if (req.method === 'GET') {
    try {
      if (type === 'team') {
        const { data, error } = await supabase.from('team_members').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        return res.status(200).json(data);
      } else if (type === 'sessions') {
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
      } else if (type === 'blog') {
        const { data, error } = await supabase.from('blog').select('*').order('published_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. Modifying methods require admin authentication
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
    if (type === 'team') {
      if (req.method === 'POST') {
        const { name, role, bio, photo, skills, is_visible } = req.body;
        if (!name || !role) {
          return res.status(400).json({ error: 'Name and Role are required fields.' });
        }
        const { count } = await supabase.from('team_members').select('*', { count: 'exact', head: true });
        const { data, error } = await supabase.from('team_members').insert({
          name,
          role,
          bio,
          photo,
          skills: skills || [],
          sort_order: count || 0,
          is_visible: is_visible !== false
        }).select().single();
        if (error) throw error;
        await logActivity(user.email, 'Create Team Member', `Added new team member: ${name} (${role})`);
        return res.status(200).json({ success: true, data });
      }

      if (req.method === 'PUT') {
        const { id, name, role, bio, photo, skills, is_visible, sort_order, reorder } = req.body;
        if (reorder && Array.isArray(reorder)) {
          for (let i = 0; i < reorder.length; i++) {
            const memberId = reorder[i];
            await supabase.from('team_members').update({ sort_order: i }).eq('id', memberId);
          }
          await logActivity(user.email, 'Reorder Team Members', 'Bulk reordered team members list.');
          return res.status(200).json({ success: true, message: 'Reordered successfully.' });
        }
        if (!id) {
          return res.status(400).json({ error: 'Missing team member ID.' });
        }
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (bio !== undefined) updateData.bio = bio;
        if (photo !== undefined) updateData.photo = photo;
        if (skills !== undefined) updateData.skills = skills;
        if (is_visible !== undefined) updateData.is_visible = is_visible;
        if (sort_order !== undefined) updateData.sort_order = sort_order;
        const { data, error } = await supabase.from('team_members').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        await logActivity(user.email, 'Update Team Member', `Updated details for team member: ${data.name}`);
        return res.status(200).json({ success: true, data });
      }

      if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ error: 'Missing team member ID.' });
        }
        const { data: member } = await supabase.from('team_members').select('name').eq('id', id).single();
        const { error } = await supabase.from('team_members').delete().eq('id', id);
        if (error) throw error;
        await logActivity(user.email, 'Delete Team Member', `Removed team member: ${member?.name || id}`);
        return res.status(200).json({ success: true, message: 'Team member deleted successfully.' });
      }
    }

    if (type === 'sessions') {
      if (req.method === 'POST') {
        const { title, presenter, scheduled_at, time, format, summary, status, photo, takeaways, registration_link } = req.body;
        if (!title || !presenter || !scheduled_at) {
          return res.status(400).json({ error: 'Title, Presenter, and Scheduled Date are required.' });
        }
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
    }

    if (type === 'blog') {
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
    }

    return res.status(405).json({ error: 'Method not supported.' });
  } catch (error) {
    console.error(`CRUD for ${type} failed:`, error);
    return res.status(500).json({ error: error.message });
  }
}
