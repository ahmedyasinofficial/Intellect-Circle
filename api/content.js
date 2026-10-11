import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, logActivity } from '../lib/_auth-middleware.js';
import { broadcastSessionAnnouncementToMembers, processScheduledSessionEmails } from '../lib/email-service.js';

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
  
  // VERCEL MOCK FALLBACK IF NO SUPABASE KEYS SET
  if (!supabaseUrl || !supabaseKey) {
    const { readFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const defaultData = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data.json'), 'utf-8'));
    
    if (req.method === 'GET') {
      let data = defaultData[type] || [];
      if (type === 'sessions') {
        const now = new Date();
        data = data.map(s => {
          if (s.status === 'upcoming' && new Date(s.scheduled_at) < now) s.status = 'completed';
          return s;
        });
      }
      return res.status(200).json(data);
    } else {
      // Modifying methods mock success
      if (req.method === 'POST') {
        const item = { id: `mock-${Date.now()}`, ...req.body };
        let emailStats = null;
        if (type === 'sessions') {
          const isEnabled = item.notify_enabled !== undefined ? Boolean(item.notify_enabled) : (item.notifyMembers !== false);
          const isScheduled = isEnabled && item.notify_timing === 'scheduled' && item.notify_send_at && new Date(item.notify_send_at) > new Date();
          item.notify_enabled = isEnabled;
          item.notify_send_at = isScheduled ? new Date(item.notify_send_at).toISOString() : null;
          item.notify_status = !isEnabled ? 'disabled' : (isScheduled ? 'scheduled' : 'sent');

          if (isEnabled && !isScheduled) {
            const siteBaseUrl = process.env.SITE_URL || (req.headers.host ? `${req.headers.referer?.split('://')[0] || 'https'}://${req.headers.host}` : 'https://intellectcircle.dpdns.org');
            const dataFilePath = join(__dirname, '..', 'src', 'data.json');
            try {
              emailStats = await broadcastSessionAnnouncementToMembers({
                session: req.body.sessionData || item,
                localDataPath: dataFilePath,
                siteBaseUrl
              });
            } catch (e) {
              console.warn('[Mock Session Broadcast]', e.message);
            }
          } else if (isScheduled) {
            emailStats = { scheduled: true, sendAt: item.notify_send_at };
          }
        }
        return res.status(200).json({ success: true, data: item, emailStats });
      }
      return res.status(200).json({ success: true, message: 'Mock action succeeded' });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Process scheduled session emails lazily in background
  processScheduledSessionEmails({ supabase }).catch(console.error);

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
        return res.status(200).json(data);
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
      const { action } = req.query;

      // Dedicated action for manually sending session reminder / announcement emails to all members
      if (req.method === 'POST' && action === 'notify-members') {
        const { sessionId, sessionData, recipients } = req.body || {};
        let targetSession = sessionData;
        if (!targetSession && sessionId) {
          const { data: dbSession, error: sErr } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
          if (sErr) throw sErr;
          targetSession = dbSession;
        }
        if (!targetSession) {
          return res.status(400).json({ error: 'Session not found for notification.' });
        }

        const siteBaseUrl = process.env.SITE_URL || (req.headers.host ? `${req.headers.referer?.split('://')[0] || 'https'}://${req.headers.host}` : 'https://intellectcircle.dpdns.org');
        const emailStats = await broadcastSessionAnnouncementToMembers({
          session: targetSession,
          supabase,
          siteBaseUrl,
          // Pass specific recipients if admin chose selective mode; null = send to all
          recipients: Array.isArray(recipients) && recipients.length > 0 ? recipients : null
        });

        const recipientDesc = Array.isArray(recipients) && recipients.length > 0
          ? `${emailStats.sent} of ${recipients.length} selected recipients`
          : `${emailStats.sent} members`;
        await logActivity(user.email, 'Broadcast Session Reminder', `Sent reminder for "${targetSession.title}" to ${recipientDesc}.`);
        return res.status(200).json({ success: true, emailStats });
      }


      if (req.method === 'POST') {
        const { title, presenter, scheduled_at, time, format, summary, status, photo, takeaways, registration_link, google_meet_link, meet_link, meetLink, notifyMembers, notify_enabled, notify_timing, notify_send_at } = req.body;
        if (!title || !presenter || !scheduled_at) {
          return res.status(400).json({ error: 'Title, Presenter, and Scheduled Date are required.' });
        }
        const computedStatus = status || 'upcoming';
        const meetUrl = google_meet_link || meet_link || meetLink || null;

        // Resolve notification settings
        const isNotifyEnabled = notify_enabled !== undefined ? Boolean(notify_enabled) : (notifyMembers !== false);
        const isScheduled = isNotifyEnabled && notify_timing === 'scheduled' && notify_send_at && new Date(notify_send_at) > new Date();
        const notifyStatus = !isNotifyEnabled ? 'disabled' : (isScheduled ? 'scheduled' : 'pending');

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
          registration_link,
          google_meet_link: meetUrl,
          notify_enabled: isNotifyEnabled,
          notify_timing: isNotifyEnabled ? (notify_timing || 'immediate') : null,
          notify_send_at: isScheduled ? new Date(notify_send_at).toISOString() : null,
          notify_status: notifyStatus
        }).select().single();
        if (error) throw error;
        await logActivity(user.email, 'Create Session', `Scheduled session: ${title} by ${presenter}`);

        // Broadcast email announcement to all members if session is upcoming and notification is immediate
        let emailStats = null;
        if (computedStatus === 'upcoming' && isNotifyEnabled && !isScheduled) {
          try {
            const siteBaseUrl = process.env.SITE_URL || (req.headers.host ? `${req.headers.referer?.split('://')[0] || 'https'}://${req.headers.host}` : 'https://intellectcircle.dpdns.org');
            emailStats = await broadcastSessionAnnouncementToMembers({
              session: data,
              supabase,
              siteBaseUrl
            });
            // Mark as sent in DB
            await supabase.from('sessions').update({ notify_status: 'sent', notify_sent_at: new Date().toISOString() }).eq('id', data.id);
            await logActivity(user.email, 'Broadcast Session Announcement', `Sent announcement for "${title}" to ${emailStats.sent} members.`);
          } catch (emailErr) {
            console.error('[Create Session] Error broadcasting session emails:', emailErr);
          }
        } else if (isScheduled) {
          emailStats = { scheduled: true, sendAt: new Date(notify_send_at).toISOString() };
          await logActivity(user.email, 'Schedule Session Announcement', `Scheduled email for "${title}" to send at ${notify_send_at}.`);
        }

        return res.status(200).json({ success: true, data, emailStats });
      }

      if (req.method === 'PUT') {
        const { id, title, presenter, scheduled_at, time, format, summary, status, photo, takeaways, registration_link, google_meet_link, meet_link, meetLink, notify_enabled, notify_timing, notify_send_at, notify_status } = req.body;
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
        const meetUrl = google_meet_link !== undefined ? google_meet_link : (meet_link !== undefined ? meet_link : meetLink);
        if (meetUrl !== undefined) updateData.google_meet_link = meetUrl;
        if (status !== undefined) updateData.status = status;
        // Notify scheduling fields
        if (notify_enabled !== undefined) updateData.notify_enabled = Boolean(notify_enabled);
        if (notify_timing !== undefined) updateData.notify_timing = notify_timing;
        if (notify_send_at !== undefined) updateData.notify_send_at = notify_send_at;
        if (notify_status !== undefined) updateData.notify_status = notify_status;
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
        const { title, published_at, author, excerpt, content, cover_image } = req.body;
        if (!title || !author) {
          return res.status(400).json({ error: 'Title and Author are required.' });
        }
        const { data, error } = await supabase.from('blog').insert({
          title,
          published_at: published_at || new Date().toISOString(),
          author,
          excerpt,
          content,
          cover_image: cover_image || null
        }).select().single();
        if (error) throw error;
        await logActivity(user.email, 'Create Blog Recap', `Published recap: ${title}`);
        return res.status(200).json({ success: true, data });
      }

      if (req.method === 'PUT') {
        const { id, title, published_at, author, excerpt, content, cover_image } = req.body;
        if (!id) {
          return res.status(400).json({ error: 'Missing blog recap ID.' });
        }
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (published_at !== undefined) updateData.published_at = published_at;
        if (author !== undefined) updateData.author = author;
        if (excerpt !== undefined) updateData.excerpt = excerpt;
        if (content !== undefined) updateData.content = content;
        if (cover_image !== undefined) updateData.cover_image = cover_image || null;
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
