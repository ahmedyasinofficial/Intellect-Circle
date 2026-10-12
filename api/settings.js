import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, logActivity } from '../lib/_auth-middleware.js';

async function handleSetupDb(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseActive = !!(supabaseUrl && supabaseKey);

  const sqlSchema = `-- Run the following SQL in your Supabase SQL Editor:

-- 1. Create Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY,
    recipient_name TEXT,
    recipient_email TEXT,
    program_name TEXT NOT NULL,
    completion_date DATE NOT NULL,
    certificate_type TEXT,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
    is_paid BOOLEAN DEFAULT FALSE,
    price NUMERIC(10, 2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS certificate_type TEXT;
ALTER TABLE public.certificates ALTER COLUMN recipient_name DROP NOT NULL;
ALTER TABLE public.certificates ALTER COLUMN recipient_email DROP NOT NULL;

-- 2. Add columns to site_settings if they don't exist
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_name TEXT DEFAULT 'Ahmad Yasin';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_title TEXT DEFAULT 'President, Intellect Circle';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_signature_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_name TEXT DEFAULT 'Zainab Shah';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_title TEXT DEFAULT 'Vice President, Intellect Circle';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_signature_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS promotion_notice TEXT DEFAULT 'Verified Intellect Circle digital certificates are provided free of charge for this session as part of our launch promotion.';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS promotion_notice_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_name_x NUMERIC DEFAULT 1755;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_name_y NUMERIC DEFAULT 800;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_name_size NUMERIC DEFAULT 38;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_program_x NUMERIC DEFAULT 1755;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_program_y NUMERIC DEFAULT 1320;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_program_size NUMERIC DEFAULT 24;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_date_x NUMERIC DEFAULT 1950;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_date_y NUMERIC DEFAULT 1700;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_date_size NUMERIC DEFAULT 12;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_pres_x NUMERIC DEFAULT 640;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_pres_y NUMERIC DEFAULT 2030;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_pres_w NUMERIC DEFAULT 120;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_pres_h NUMERIC DEFAULT 40;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_vp_x NUMERIC DEFAULT 2070;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_vp_y NUMERIC DEFAULT 2030;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_vp_w NUMERIC DEFAULT 120;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_vp_h NUMERIC DEFAULT 40;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_qr_x NUMERIC DEFAULT 3120;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_qr_y NUMERIC DEFAULT 2050;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_qr_size NUMERIC DEFAULT 45;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_id_x NUMERIC DEFAULT 3120;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_id_y NUMERIC DEFAULT 2130;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cert_id_size NUMERIC DEFAULT 7;

-- 3. Enable RLS on Certificates Table
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DROP POLICY IF EXISTS "Allow anonymous read access to certificates" ON public.certificates;
CREATE POLICY "Allow anonymous read access to certificates" ON public.certificates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated admins full access to certificates" ON public.certificates;
CREATE POLICY "Allow authenticated admins full access to certificates" ON public.certificates
    FOR ALL USING (true);

-- 5. Add columns to submissions for welcome email if they don't exist
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS welcome_email_status TEXT DEFAULT 'pending';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS welcome_email_send_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour');
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- 6. Reload Supabase PostgREST API schema cache
NOTIFY pgrst, 'reload schema';
`;

  if (!isSupabaseActive) {
    return res.status(200).json({
      success: true,
      message: 'Supabase is not active (running in offline/mock environment).',
      status: 'offline',
      sqlSchema
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  let certificatesTableExists = false;
  let errorMsg = '';
  try {
    const { error } = await supabase.from('certificates').select('id').limit(1);
    if (!error) {
      certificatesTableExists = true;
    } else {
      errorMsg = error.message;
      if (error.code === 'PGRST116') {
        certificatesTableExists = true;
      }
    }
  } catch (err) {
    errorMsg = err.message;
  }

  if (req.method === 'POST') {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (dbUrl) {
      try {
        const pg = await import('pg');
        const pool = new pg.default.Pool({ connectionString: dbUrl });
        await pool.query(sqlSchema);
        await pool.end();
        return res.status(200).json({
          success: true,
          status: 'configured',
          message: 'SQL Schema successfully created in Supabase database.',
          sqlSchema
        });
      } catch (err) {
        return res.status(500).json({
          success: false,
          status: 'failed',
          error: `Auto-setup failed: ${err.message}`,
          sqlSchema
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        status: 'manual_required',
        error: 'DATABASE_URL or POSTGRES_URL environment variable is not set. Please execute the SQL schema manually in your Supabase SQL editor.',
        sqlSchema
      });
    }
  }

  return res.status(200).json({
    success: true,
    status: certificatesTableExists ? 'configured' : 'manual_required',
    message: certificatesTableExists 
      ? 'Certificates table is successfully configured and active.' 
      : `Certificates table not found: ${errorMsg}`,
    sqlSchema
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query || {};
  const url = req.url || '';

  // 1. Setup DB endpoint route (/api/setup-db)
  if (action === 'setup-db' || url.includes('/api/setup-db')) {
    return handleSetupDb(req, res);
  }

  // 2. Standard Settings API route
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ success: true, message: 'Settings saved (mocked fallback)' });
  }

  const clientOptions = { auth: { persistSession: false } };
  const authHeader = req.headers.authorization;
  if (authHeader && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    clientOptions.global = {
      headers: { Authorization: authHeader }
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, clientOptions);

  const payload = req.body;
  if (!payload) {
    return res.status(400).json({ error: 'Missing configuration payload.' });
  }

  try {
    if (payload.admin) {
      const siteSettingsPayload = { id: 1 };
      if (payload.admin.web3formsKey !== undefined) {
        siteSettingsPayload.web3forms_key = payload.admin.web3formsKey;
      }
      if (payload.admin.authorizedSignatureUrl !== undefined) {
        siteSettingsPayload.authorized_signature_url = payload.admin.authorizedSignatureUrl;
      }
      if (payload.admin.presidentName !== undefined) {
        siteSettingsPayload.president_name = payload.admin.presidentName;
      }
      if (payload.admin.presidentTitle !== undefined) {
        siteSettingsPayload.president_title = payload.admin.presidentTitle;
      }
      if (payload.admin.presidentSignatureUrl !== undefined) {
        siteSettingsPayload.president_signature_url = payload.admin.presidentSignatureUrl;
      }
      if (payload.admin.vicePresidentName !== undefined) {
        siteSettingsPayload.vice_president_name = payload.admin.vicePresidentName;
      }
      if (payload.admin.vicePresidentTitle !== undefined) {
        siteSettingsPayload.vice_president_title = payload.admin.vicePresidentTitle;
      }
      if (payload.admin.vicePresidentSignatureUrl !== undefined) {
        siteSettingsPayload.vice_president_signature_url = payload.admin.vicePresidentSignatureUrl;
      }
      if (payload.admin.promotionNotice !== undefined) {
        siteSettingsPayload.promotion_notice = payload.admin.promotionNotice;
      }
      if (payload.admin.promotionNoticeEnabled !== undefined) {
        siteSettingsPayload.promotion_notice_enabled = payload.admin.promotionNoticeEnabled;
      }

      const layoutKeys = [
        'cert_name_x', 'cert_name_y', 'cert_name_size',
        'cert_program_x', 'cert_program_y', 'cert_program_size',
        'cert_date_x', 'cert_date_y', 'cert_date_size',
        'cert_pres_x', 'cert_pres_y', 'cert_pres_w', 'cert_pres_h',
        'cert_vp_x', 'cert_vp_y', 'cert_vp_w', 'cert_vp_h',
        'cert_qr_x', 'cert_qr_y', 'cert_qr_size',
        'cert_id_x', 'cert_id_y', 'cert_id_size',
      ];
      for (const key of layoutKeys) {
        if (payload.admin[key] !== undefined) {
          siteSettingsPayload[key] = Number(payload.admin[key]);
        }
      }
      const { error: siteSettingsError } = await supabase.from('site_settings').upsert(siteSettingsPayload);
      if (siteSettingsError) {
        console.error('[Settings] site_settings upsert error:', siteSettingsError);
        return res.status(500).json({ error: `Failed to save site settings: ${siteSettingsError.message}` });
      }
    }

    if (payload.home) {
      const { hero, ctaSection, aboutTeaser } = payload.home;
      await supabase.from('homepage_content').upsert({
        id: 1,
        hero_headline: hero?.headline,
        hero_tagline: hero?.tagline,
        hero_description: hero?.description,
        hero_cta_apply_label: hero?.ctaApplyLabel,
        hero_cta_learn_label: hero?.ctaLearnLabel,
        about_teaser_title: aboutTeaser?.title,
        about_teaser_subtitle: aboutTeaser?.subtitle,
        cta_headline: ctaSection?.headline,
        cta_subheadline: ctaSection?.subheadline,
        cta_button_label: ctaSection?.buttonLabel
      });

      if (payload.home.stats && Array.isArray(payload.home.stats)) {
        for (let i = 0; i < payload.home.stats.length; i++) {
          const s = payload.home.stats[i];
          await supabase.from('statistics').upsert({
            key: s.id,
            label: s.label,
            value: s.value,
            sort_order: i
          }, { onConflict: 'key' });
        }
      }

      if (aboutTeaser?.columns && Array.isArray(aboutTeaser.columns)) {
        await supabase.from('about_teaser_columns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const cols = aboutTeaser.columns.map((col, i) => ({
          title: col.title,
          description: col.description || '',
          sort_order: i
        }));
        if (cols.length > 0) {
          await supabase.from('about_teaser_columns').insert(cols);
        }
      }

      if (payload.home.howItWorks?.steps && Array.isArray(payload.home.howItWorks.steps)) {
        await supabase.from('how_it_works_steps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const steps = payload.home.howItWorks.steps.map((step, i) => ({
          number: step.number,
          text: step.text || '',
          sort_order: i
        }));
        if (steps.length > 0) {
          await supabase.from('how_it_works_steps').insert(steps);
        }
      }

      if (payload.home.geographicModel?.levels && Array.isArray(payload.home.geographicModel.levels)) {
        await supabase.from('geographic_levels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const seenGeo = new Set();
        const cleanGeo = [];
        for (let i = 0; i < payload.home.geographicModel.levels.length; i++) {
          const lvl = payload.home.geographicModel.levels[i];
          const label = (lvl.label || '').trim();
          if (!label) continue;
          const k = label.toLowerCase();
          if (!seenGeo.has(k)) {
            seenGeo.add(k);
            cleanGeo.push({
              label,
              active: Boolean(lvl.active),
              sort_order: cleanGeo.length
            });
          }
        }
        if (cleanGeo.length > 0) {
          const { error: insErr } = await supabase.from('geographic_levels').insert(cleanGeo);
          if (insErr) console.error('[Settings] Error inserting geographic_levels:', insErr);
        }
      }

      if (payload.home.pillars?.items && Array.isArray(payload.home.pillars.items)) {
        await supabase.from('pillars').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const seenPillars = new Set();
        const cleanPillars = [];
        for (let i = 0; i < payload.home.pillars.items.length; i++) {
          const p = payload.home.pillars.items[i];
          const name = (p.name || '').trim();
          if (!name) continue;
          const k = name.toLowerCase();
          if (!seenPillars.has(k)) {
            seenPillars.add(k);
            cleanPillars.push({
              name,
              description: p.description || '',
              status: p.status || 'Coming Soon',
              sort_order: cleanPillars.length
            });
          }
        }
        if (cleanPillars.length > 0) {
          const { error: insErr } = await supabase.from('pillars').insert(cleanPillars);
          if (insErr) console.error('[Settings] Error inserting pillars:', insErr);
        }
      }

      if (payload.home.collaborations?.partners && Array.isArray(payload.home.collaborations.partners)) {
        await supabase.from('partners').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const partners = payload.home.collaborations.partners.map((part, i) => ({
          name: part.name,
          logo_url: part.logoUrl,
          description: part.description || '',
          sort_order: i
        }));
        if (partners.length > 0) {
          await supabase.from('partners').insert(partners);
        }
      }
    }

    if (payload.about) {
      if (payload.about.values && Array.isArray(payload.about.values)) {
        await supabase.from('about_values').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const vals = payload.about.values.map((v, i) => ({
          icon: v.icon,
          title: v.title,
          description: v.description || '',
          sort_order: i
        }));
        if (vals.length > 0) {
          await supabase.from('about_values').insert(vals);
        }
      }

      if (payload.about.differences && Array.isArray(payload.about.differences)) {
        await supabase.from('about_differences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const diffs = payload.about.differences.map((d, i) => ({
          title: d.title,
          description: d.description || '',
          sort_order: i
        }));
        if (diffs.length > 0) {
          await supabase.from('about_differences').insert(diffs);
        }
      }
    }

    if (payload.contact) {
      await supabase.from('contact_settings').upsert({
        id: 1,
        email: payload.contact.email,
        whatsapp: payload.contact.whatsapp,
        address: payload.contact.address
      });

      await supabase.from('social_links').upsert({
        id: 1,
        instagram: payload.contact.instagram,
        linkedin: payload.contact.linkedin,
        facebook: payload.contact.facebook,
        twitter: payload.contact.twitter
      });
    }

    if (payload.seo) {
      for (const [key, s] of Object.entries(payload.seo)) {
        await supabase.from('seo_settings').upsert({
          page_key: key,
          title: s.title,
          description: s.description,
          keywords: s.keywords,
          og_image: s.ogImage,
          favicon: s.favicon,
          canonical_url: s.canonicalUrl
        });
      }
    }

    await logActivity(user.email, 'Update Site Settings', 'General copy, SEO configs, and contact information updated successfully.');

    return res.status(200).json({ success: true, message: 'Settings saved successfully.' });
  } catch (error) {
    console.error('Error saving settings to relational database:', error);
    return res.status(500).json({ error: error.message });
  }
}
