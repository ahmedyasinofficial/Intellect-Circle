import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, logActivity } from './_auth-middleware.js';

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

  const { action } = req.query;

  // GET requests (viewing media list) are public
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

  // Modifying methods (POST, DELETE) require admin authentication
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
      if (action === 'upload') {
        const { fileName, base64Data } = req.body;
        if (!fileName || !base64Data) {
          return res.status(400).json({ error: 'Missing fileName or base64Data.' });
        }

        const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, 'base64');

        // Fallback to local file upload if Supabase is not configured (e.g. local offline development)
        if (!supabaseUrl || !supabaseKey) {
          try {
            const __dirname = dirname(fileURLToPath(import.meta.url));
            const uploadDir = resolve(__dirname, '..', 'public', 'uploads');
            if (!existsSync(uploadDir)) {
              mkdirSync(uploadDir, { recursive: true });
            }
            const destPath = resolve(uploadDir, fileName);
            writeFileSync(destPath, buffer);
            
            return res.status(200).json({
              success: true,
              url: `/uploads/${fileName}`,
              name: fileName,
              size: buffer.length,
              mime_type: mimeType
            });
          } catch (err) {
            console.error('Local file upload fallback failed:', err);
            return res.status(500).json({ error: err.message });
          }
        }

        const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(uniqueFileName, buffer, {
            contentType: mimeType,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(uniqueFileName);

        const { data: dbItem, error: dbError } = await supabase.from('media_library').insert({
          name: fileName,
          url: publicUrl,
          size: buffer.length,
          mime_type: mimeType
        }).select().single();

        if (dbError) throw dbError;

        await logActivity(user.email, 'Add Media Asset', `Uploaded media item: ${fileName}`);
        return res.status(200).json({
          success: true,
          url: publicUrl,
          name: fileName,
          size: buffer.length,
          mime_type: mimeType,
          id: dbItem.id
        });
      } else {
        // Standard media record insert (fallback/direct)
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
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing media ID.' });
      }

      const { data: mediaItem } = await supabase.from('media_library').select('*').eq('id', id).single();
      if (!mediaItem) {
        return res.status(404).json({ error: 'Media asset not found.' });
      }

      await supabase.from('media_library').delete().eq('id', id);

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
