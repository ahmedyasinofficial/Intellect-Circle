import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load fallback default data
let defaultData = {};
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const jsonPath = join(__dirname, '..', 'src', 'data.json');
  defaultData = JSON.parse(readFileSync(jsonPath, 'utf-8'));
} catch (e) {
  defaultData = { submissions: { applications: [], contacts: [] } };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json(defaultData);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Run parallel fetches from Supabase
    const [
      siteRes,
      homeContentRes,
      seoRes,
      contactRes,
      socialRes,
      statsRes,
      teaserColsRes,
      howStepsRes,
      pillarsRes,
      geoLevelsRes,
      partnersRes,
      valuesRes,
      diffsRes,
      teamRes,
      sessionsRes,
      blogRes,
      submissionsRes
    ] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', 1).single(),
      supabase.from('homepage_content').select('*').eq('id', 1).single(),
      supabase.from('seo_settings').select('*'),
      supabase.from('contact_settings').select('*').eq('id', 1).single(),
      supabase.from('social_links').select('*').eq('id', 1).single(),
      supabase.from('statistics').select('*').order('sort_order', { ascending: true }),
      supabase.from('about_teaser_columns').select('*').order('sort_order', { ascending: true }),
      supabase.from('how_it_works_steps').select('*').order('sort_order', { ascending: true }),
      supabase.from('pillars').select('*').order('sort_order', { ascending: true }),
      supabase.from('geographic_levels').select('*').order('sort_order', { ascending: true }),
      supabase.from('partners').select('*').order('sort_order', { ascending: true }),
      supabase.from('about_values').select('*').order('sort_order', { ascending: true }),
      supabase.from('about_differences').select('*').order('sort_order', { ascending: true }),
      supabase.from('team_members').select('*').order('sort_order', { ascending: true }),
      supabase.from('sessions').select('*').order('scheduled_at', { ascending: false }),
      supabase.from('blog').select('*').order('published_at', { ascending: false }),
      supabase.from('submissions').select('*').order('created_at', { ascending: false })
    ]);

    // Handle site settings
    const siteSettings = siteRes.data || { 
      title: 'Intellect Circle', 
      logo_url: '/assets/logo.png', 
      web3forms_key: '', 
      navigation_links: [],
      authorized_signature_url: '',
      president_name: 'Ahmad Yasin',
      president_title: 'President, Intellect Circle',
      president_signature_url: '',
      vice_president_name: 'Zainab Shah',
      vice_president_title: 'Vice President, Intellect Circle',
      vice_president_signature_url: '',
      promotion_notice: 'Verified Intellect Circle digital certificates are provided free of charge for this session as part of our launch promotion.',
      promotion_notice_enabled: true
    };

    // Format SEO
    const seo = {};
    if (seoRes.data) {
      seoRes.data.forEach(item => {
        seo[item.page_key] = {
          title: item.title,
          description: item.description,
          keywords: item.keywords,
          ogImage: item.og_image,
          favicon: item.favicon,
          canonicalUrl: item.canonical_url
        };
      });
    }

    // Format home content
    const home = {
      hero: {
        headline: homeContentRes.data?.hero_headline || '',
        tagline: homeContentRes.data?.hero_tagline || '',
        description: homeContentRes.data?.hero_description || '',
        ctaApplyLabel: homeContentRes.data?.hero_cta_apply_label || 'Apply to Join',
        ctaLearnLabel: homeContentRes.data?.hero_cta_learn_label || 'Learn More'
      },
      stats: (statsRes.data || []).map(s => ({ id: s.key, label: s.label, value: s.value })),
      aboutTeaser: {
        title: homeContentRes.data?.about_teaser_title || '',
        subtitle: homeContentRes.data?.about_teaser_subtitle || '',
        columns: (teaserColsRes.data || []).map(col => ({ title: col.title, description: col.description }))
      },
      howItWorks: {
        title: 'How It Works',
        steps: (howStepsRes.data || []).map(step => ({ number: step.number, text: step.text }))
      },
      pillars: {
        title: 'Pillars of Intellect Circle',
        items: (pillarsRes.data || []).map(p => ({ id: p.id, name: p.name, description: p.description, status: p.status }))
      },
      geographicModel: {
        title: 'Geographic Model',
        description: 'A structural scaling strategy beginning on your block.',
        levels: (geoLevelsRes.data || []).map(l => ({ label: l.label, active: l.active }))
      },
      collaborations: {
        title: 'Collaborations & Networks',
        partners: (partnersRes.data || []).map(p => ({ id: p.id, name: p.name, logoUrl: p.logo_url, description: p.description }))
      },
      ctaSection: {
        headline: homeContentRes.data?.cta_headline || '',
        subheadline: homeContentRes.data?.cta_subheadline || '',
        buttonLabel: homeContentRes.data?.cta_button_label || ''
      },
      featuredSessionId: ''
    };

    // Format about page
    const about = {
      vision: {
        title: 'Our Vision',
        text: 'To nurture a generation of articulate, critically thinking leaders who bridge diverse disciplines to drive intellectual progress in Pakistan.'
      },
      mission: {
        title: 'Our Mission',
        text: 'To provide a structured, peer-led forum where ambitious youth (ages 17–30) share expertise, practice rhetoric, and engage in high-signal discussions.'
      },
      values: (valuesRes.data || []).map(v => ({ id: v.id, icon: v.icon, title: v.title, description: v.description })),
      founderStory: {
        title: 'How it Started',
        text: 'Intellect Circle began as a small gathering of students in Lahore who were frustrated by the lack of focused spaces for serious learning outside standard curricula...'
      },
      differences: (diffsRes.data || []).map(d => ({ title: d.title, description: d.description }))
    };

    // Parse specific vision/mission values if saved inside site config or just keep the formatted ones
    // Format team
    const team = (teamRes.data || []).map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      bio: member.bio,
      photo: member.photo,
      skills: member.skills || []
    }));

    // Format sessions
    const now = new Date();
    const sessions = (sessionsRes.data || []).map(s => {
      // Automatically determine if completed or upcoming based on scheduled_at time
      let computedStatus = s.status;
      const scheduledTime = new Date(s.scheduled_at);
      if (s.status === 'upcoming' && scheduledTime < now) {
        computedStatus = 'completed';
      }
      return {
        id: s.id,
        title: s.title,
        presenter: s.presenter,
        date: new Date(s.scheduled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        scheduledAt: s.scheduled_at,
        time: s.time || new Date(s.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        format: s.format,
        summary: s.summary,
        isUpcoming: computedStatus === 'upcoming',
        status: computedStatus,
        takeaways: s.takeaways || [],
        photo: s.photo,
        registrationLink: s.registration_link
      };
    });

    // Find featured session id (next upcoming or latest completed)
    const nextUpcoming = sessions.find(s => s.isUpcoming);
    const latestCompleted = sessions.find(s => !s.isUpcoming);
    home.featuredSessionId = nextUpcoming ? nextUpcoming.id : (latestCompleted ? latestCompleted.id : '');

    // Format blog recaps
    const blog = (blogRes.data || []).map(b => ({
      id: b.id,
      title: b.title,
      date: new Date(b.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      publishedAt: b.published_at,
      author: b.author,
      excerpt: b.excerpt,
      content: b.content
    }));

    // Format contact settings
    const contact = {
      email: contactRes.data?.email || '',
      whatsapp: contactRes.data?.whatsapp || '',
      address: contactRes.data?.address || '',
      instagram: socialRes.data?.instagram || '',
      linkedin: socialRes.data?.linkedin || '',
      facebook: socialRes.data?.facebook || '',
      twitter: socialRes.data?.twitter || ''
    };

    // Format submissions
    const applications = [];
    const contacts = [];
    if (submissionsRes.data) {
      submissionsRes.data.forEach(row => {
        if (row.type === 'application') {
          applications.push({
            id: row.id,
            name: row.name,
            email: row.email,
            age: row.age,
            city: row.city,
            occupation: row.occupation,
            whyJoin: row.why_join,
            heardAbout: row.heard_about,
            heardAboutCombined: row.heard_about,
            submittedAt: row.created_at
          });
        } else if (row.type === 'contact') {
          contacts.push({
            id: row.id,
            name: row.name,
            email: row.email,
            message: row.message,
            submittedAt: row.created_at
          });
        }
      });
    }

    const assembledData = {
      admin: {
        email: 'admin@intellectcircle.com', // Supabase Auth handled, dummy returned for compatibility
        passwordHash: '',
        web3formsKey: siteSettings.web3forms_key || '',
        authorizedSignatureUrl: siteSettings.authorized_signature_url || '',
        presidentName: siteSettings.president_name || 'Ahmad Yasin',
        presidentTitle: siteSettings.president_title || 'President, Intellect Circle',
        presidentSignatureUrl: siteSettings.president_signature_url || '',
        vicePresidentName: siteSettings.vice_president_name || 'Zainab Shah',
        vicePresidentTitle: siteSettings.vice_president_title || 'Vice President, Intellect Circle',
        vicePresidentSignatureUrl: siteSettings.vice_president_signature_url || '',
        promotionNotice: siteSettings.promotion_notice || 'Verified Intellect Circle digital certificates are provided free of charge for this session as part of our launch promotion.',
        promotionNoticeEnabled: siteSettings.promotion_notice_enabled !== false,
        // Certificate layout coordinates (pass through to frontend)
        cert_name_x: siteSettings.cert_name_x,
        cert_name_y: siteSettings.cert_name_y,
        cert_name_size: siteSettings.cert_name_size,
        cert_program_x: siteSettings.cert_program_x,
        cert_program_y: siteSettings.cert_program_y,
        cert_program_size: siteSettings.cert_program_size,
        cert_date_x: siteSettings.cert_date_x,
        cert_date_y: siteSettings.cert_date_y,
        cert_date_size: siteSettings.cert_date_size,
        cert_pres_x: siteSettings.cert_pres_x,
        cert_pres_y: siteSettings.cert_pres_y,
        cert_pres_w: siteSettings.cert_pres_w,
        cert_pres_h: siteSettings.cert_pres_h,
        cert_vp_x: siteSettings.cert_vp_x,
        cert_vp_y: siteSettings.cert_vp_y,
        cert_vp_w: siteSettings.cert_vp_w,
        cert_vp_h: siteSettings.cert_vp_h,
        cert_qr_x: siteSettings.cert_qr_x,
        cert_qr_y: siteSettings.cert_qr_y,
        cert_qr_size: siteSettings.cert_qr_size,
        cert_id_x: siteSettings.cert_id_x,
        cert_id_y: siteSettings.cert_id_y,
        cert_id_size: siteSettings.cert_id_size,
      },
      seo,
      home,
      about,
      team,
      sessions,
      blog,
      contact,
      submissions: {
        applications,
        contacts
      }
    };

    return res.status(200).json(assembledData);
  } catch (error) {
    console.error('Error combining relational Supabase tables:', error);
    return res.status(200).json(defaultData);
  }
}
