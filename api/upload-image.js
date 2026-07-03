import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, base64Data } = req.body;
  if (!fileName || !base64Data) {
    return res.status(400).json({ error: 'Missing fileName or base64Data.' });
  }

  // Parse mime type and base64 string
  const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, 'base64');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

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

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Upload to Supabase Storage Bucket 'media'
    const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(uniqueFileName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(uniqueFileName);

    // Save image metadata in public.media_library database table
    const { data: dbItem, error: dbError } = await supabase.from('media_library').insert({
      name: fileName,
      url: publicUrl,
      size: buffer.length,
      mime_type: mimeType
    }).select().single();

    if (dbError) throw dbError;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      name: fileName,
      size: buffer.length,
      mime_type: mimeType,
      id: dbItem.id
    });
  } catch (error) {
    console.error('Supabase Storage image upload failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
