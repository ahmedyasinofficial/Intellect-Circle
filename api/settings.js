import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, logActivity } from './_auth-middleware.js';

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

  // 1. Authenticate
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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ success: true, message: 'Settings saved (mocked fallback)' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const payload = req.body;
  if (!payload) {
    return res.status(400).json({ error: 'Missing configuration payload.' });
  }

  try {
    // 2. Perform updates to site settings
    if (payload.admin?.web3formsKey !== undefined) {
      await supabase.from('site_settings').upsert({ id: 1, web3forms_key: payload.admin.web3formsKey });
    }

    // 3. Homepage settings
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

      // Update statistics
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

      // Update about teaser columns
      if (aboutTeaser?.columns && Array.isArray(aboutTeaser.columns)) {
        await supabase.from('about_teaser_columns').delete().gt('sort_order', -1); // reset to seed
        for (let i = 0; i < aboutTeaser.columns.length; i++) {
          const col = aboutTeaser.columns[i];
          await supabase.from('about_teaser_columns').insert({
            title: col.title,
            description: col.description,
            sort_order: i
          });
        }
      }

      // Update how steps
      if (payload.home.howItWorks?.steps && Array.isArray(payload.home.howItWorks.steps)) {
        await supabase.from('how_it_works_steps').delete().gt('sort_order', -1);
        for (let i = 0; i < payload.home.howItWorks.steps.length; i++) {
          const step = payload.home.howItWorks.steps[i];
          await supabase.from('how_it_works_steps').insert({
            number: step.number,
            text: step.text,
            sort_order: i
          });
        }
      }

      // Update geographic levels
      if (payload.home.geographicModel?.levels && Array.isArray(payload.home.geographicModel.levels)) {
        await supabase.from('geographic_levels').delete().gt('sort_order', -1);
        for (let i = 0; i < payload.home.geographicModel.levels.length; i++) {
          const lvl = payload.home.geographicModel.levels[i];
          await supabase.from('geographic_levels').insert({
            label: lvl.label,
            active: lvl.active,
            sort_order: i
          });
        }
      }

      // Update pillars
      if (payload.home.pillars?.items && Array.isArray(payload.home.pillars.items)) {
        await supabase.from('pillars').delete().gt('sort_order', -1);
        for (let i = 0; i < payload.home.pillars.items.length; i++) {
          const p = payload.home.pillars.items[i];
          await supabase.from('pillars').insert({
            name: p.name,
            description: p.description,
            status: p.status,
            sort_order: i
          });
        }
      }

      // Update partners
      if (payload.home.collaborations?.partners && Array.isArray(payload.home.collaborations.partners)) {
        await supabase.from('partners').delete().gt('sort_order', -1);
        for (let i = 0; i < payload.home.collaborations.partners.length; i++) {
          const part = payload.home.collaborations.partners[i];
          await supabase.from('partners').insert({
            name: part.name,
            logo_url: part.logoUrl,
            description: part.description,
            sort_order: i
          });
        }
      }
    }

    // 4. About page settings
    if (payload.about) {
      // Update values
      if (payload.about.values && Array.isArray(payload.about.values)) {
        await supabase.from('about_values').delete().gt('sort_order', -1);
        for (let i = 0; i < payload.about.values.length; i++) {
          const v = payload.about.values[i];
          await supabase.from('about_values').insert({
            icon: v.icon,
            title: v.title,
            description: v.description,
            sort_order: i
          });
        }
      }

      // Update differences
      if (payload.about.differences && Array.isArray(payload.about.differences)) {
        await supabase.from('about_differences').delete().gt('sort_order', -1);
        for (let i = 0; i < payload.about.differences.length; i++) {
          const d = payload.about.differences[i];
          await supabase.from('about_differences').insert({
            title: d.title,
            description: d.description,
            sort_order: i
          });
        }
      }
    }

    // 5. Contact & Socials
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

    // 6. SEO configurations
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

    // 7. Activity Log
    await logActivity(user.email, 'Update Site Settings', 'General copy, SEO configs, and contact information updated successfully.');

    return res.status(200).json({ success: true, message: 'Settings saved successfully.' });
  } catch (error) {
    console.error('Error saving settings to relational database:', error);
    return res.status(500).json({ error: error.message });
  }
}
