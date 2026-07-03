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
      const { data, error } = await supabase.from('team_members').select('*').order('sort_order', { ascending: true });
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
      const { name, role, bio, photo, skills, is_visible } = req.body;
      if (!name || !role) {
        return res.status(400).json({ error: 'Name and Role are required fields.' });
      }

      // Get count for sort order
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
      
      // Handle bulk reordering
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

      // Fetch name first to log it
      const { data: member } = await supabase.from('team_members').select('name').eq('id', id).single();

      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;

      await logActivity(user.email, 'Delete Team Member', `Removed team member: ${member?.name || id}`);
      return res.status(200).json({ success: true, message: 'Team member deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Team member CRUD failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
