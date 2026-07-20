-- INTELLECT CIRCLE WEBSITE - DATABASE SCHEMA & INITIAL SEED
-- Compatible with Supabase PostgreSQL

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- 1. TABLES DEFINITIONS
-- -------------------------------------------------------------

-- Admin Users Role & Permissions
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY, -- Maps to auth.users.id
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INT PRIMARY KEY DEFAULT 1,
    title TEXT DEFAULT 'Intellect Circle',
    logo_url TEXT,
    web3forms_key TEXT,
    navigation_links JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

-- Homepage Content Table
CREATE TABLE IF NOT EXISTS public.homepage_content (
    id INT PRIMARY KEY DEFAULT 1,
    hero_headline TEXT,
    hero_tagline TEXT,
    hero_description TEXT,
    hero_cta_apply_label TEXT DEFAULT 'Apply to Join',
    hero_cta_learn_label TEXT DEFAULT 'Learn More',
    about_teaser_title TEXT,
    about_teaser_subtitle TEXT,
    cta_headline TEXT,
    cta_subheadline TEXT,
    cta_button_label TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

-- SEO Settings Table
CREATE TABLE IF NOT EXISTS public.seo_settings (
    page_key TEXT PRIMARY KEY, -- 'home', 'about', 'sessions', 'team', 'apply', 'contact'
    title TEXT NOT NULL,
    description TEXT,
    keywords TEXT,
    og_image TEXT,
    favicon TEXT,
    canonical_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Settings Table
CREATE TABLE IF NOT EXISTS public.contact_settings (
    id INT PRIMARY KEY DEFAULT 1,
    email TEXT,
    whatsapp TEXT,
    address TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

-- Social Links Table
CREATE TABLE IF NOT EXISTS public.social_links (
    id INT PRIMARY KEY DEFAULT 1,
    instagram TEXT,
    linkedin TEXT,
    facebook TEXT,
    twitter TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

-- Statistics Table
CREATE TABLE IF NOT EXISTS public.statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- 'members', 'sessions', 'topics', 'cities'
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

-- About Values Table
CREATE TABLE IF NOT EXISTS public.about_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

-- About Differences Table
CREATE TABLE IF NOT EXISTS public.about_differences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

-- About Teaser Columns Table
CREATE TABLE IF NOT EXISTS public.about_teaser_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

-- How It Works Steps Table
CREATE TABLE IF NOT EXISTS public.how_it_works_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number TEXT NOT NULL,
    text TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

-- Pillars Table
CREATE TABLE IF NOT EXISTS public.pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Coming Soon' CHECK (status IN ('Live', 'Coming Soon')),
    sort_order INT DEFAULT 0
);

-- Geographic Levels Table
CREATE TABLE IF NOT EXISTS public.geographic_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    active BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0
);

-- Partners Table
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    sort_order INT DEFAULT 0
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT,
    photo TEXT,
    skills JSONB DEFAULT '[]'::jsonb, -- Using jsonb for flexibility instead of text[]
    sort_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    presenter TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    time TEXT,
    format TEXT,
    summary TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    photo TEXT,
    takeaways JSONB DEFAULT '[]'::jsonb, -- Using jsonb for flexibility instead of text[]
    registration_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Recap Posts Table
CREATE TABLE IF NOT EXISTS public.blog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(), -- Proper timestamptz for dates
    author TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Library Metadata Table
CREATE TABLE IF NOT EXISTS public.media_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    size INT,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions Table (Applications + Contact inquiries)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('application', 'contact')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    age INT,
    city TEXT,
    occupation TEXT,
    why_join TEXT,
    heard_about TEXT,
    message TEXT,
    mobile_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    welcome_email_status TEXT DEFAULT 'pending',
    welcome_email_sent_at TIMESTAMPTZ,
    welcome_email_send_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_differences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_teaser_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.how_it_works_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geographic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function to check if current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public READ access policies
CREATE POLICY "Allow public select on admin_users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Allow public select on site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Allow public select on homepage_content" ON public.homepage_content FOR SELECT USING (true);
CREATE POLICY "Allow public select on seo_settings" ON public.seo_settings FOR SELECT USING (true);
CREATE POLICY "Allow public select on contact_settings" ON public.contact_settings FOR SELECT USING (true);
CREATE POLICY "Allow public select on social_links" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "Allow public select on statistics" ON public.statistics FOR SELECT USING (true);
CREATE POLICY "Allow public select on about_values" ON public.about_values FOR SELECT USING (true);
CREATE POLICY "Allow public select on about_differences" ON public.about_differences FOR SELECT USING (true);
CREATE POLICY "Allow public select on about_teaser_columns" ON public.about_teaser_columns FOR SELECT USING (true);
CREATE POLICY "Allow public select on how_it_works_steps" ON public.how_it_works_steps FOR SELECT USING (true);
CREATE POLICY "Allow public select on pillars" ON public.pillars FOR SELECT USING (true);
CREATE POLICY "Allow public select on geographic_levels" ON public.geographic_levels FOR SELECT USING (true);
CREATE POLICY "Allow public select on partners" ON public.partners FOR SELECT USING (true);
CREATE POLICY "Allow public select on team_members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Allow public select on sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Allow public select on blog" ON public.blog FOR SELECT USING (true);
CREATE POLICY "Allow public select on media_library" ON public.media_library FOR SELECT USING (true);

-- Submission Insert access (anyone can apply or contact)
CREATE POLICY "Allow public insert on submissions" ON public.submissions FOR INSERT WITH CHECK (true);

-- Admin WRITE access policies
CREATE POLICY "Admin write access on admin_users" ON public.admin_users FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on site_settings" ON public.site_settings FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on homepage_content" ON public.homepage_content FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on seo_settings" ON public.seo_settings FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on contact_settings" ON public.contact_settings FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on social_links" ON public.social_links FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on statistics" ON public.statistics FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on about_values" ON public.about_values FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on about_differences" ON public.about_differences FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on about_teaser_columns" ON public.about_teaser_columns FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on how_it_works_steps" ON public.how_it_works_steps FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on pillars" ON public.pillars FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on geographic_levels" ON public.geographic_levels FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on partners" ON public.partners FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on team_members" ON public.team_members FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on sessions" ON public.sessions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on blog" ON public.blog FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on media_library" ON public.media_library FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on submissions" ON public.submissions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write access on activity_logs" ON public.activity_logs FOR ALL USING (public.is_admin());

-- -------------------------------------------------------------
-- 3. STORAGE CONFIGURATION
-- -------------------------------------------------------------
-- Note: Make sure to run these statements to register storage bucket policies if table exists.
-- Bucket creation is normally done via Supabase dashboard, but the following creates public access
-- to a bucket named 'media'.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow public read access to media bucket"
  ON storage.objects FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Allow admin upload access to media bucket"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND public.is_admin());

CREATE POLICY "Allow admin update access to media bucket"
  ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND public.is_admin());

CREATE POLICY "Allow admin delete access to media bucket"
  ON storage.objects FOR DELETE USING (bucket_id = 'media' AND public.is_admin());

-- -------------------------------------------------------------
-- 4. SEED DATA
-- -------------------------------------------------------------

-- Seed Site Settings
INSERT INTO public.site_settings (id, title, logo_url, web3forms_key, navigation_links)
VALUES (1, 'Intellect Circle', '/assets/logo.png', '', '["Home", "About", "Sessions", "Team", "Apply", "Contact"]')
ON CONFLICT (id) DO NOTHING;

-- Seed Homepage Content
INSERT INTO public.homepage_content (id, hero_headline, hero_tagline, hero_description, about_teaser_title, about_teaser_subtitle, cta_headline, cta_subheadline, cta_button_label)
VALUES (
    1, 
    'Intellect Circle', 
    'A structured learning community for young intellects in Punjab.', 
    'Gathering bi-weekly to share expertise, challenge perspectives, and build deep intellectual connections.',
    'What is Intellect Circle?',
    'A selective peer-to-peer knowledge sharing community built on structure and mutual respect.',
    'Ready to expand your intellectual horizons?',
    'Applications are open for our upcoming cohort in Punjab.',
    'Apply for Membership'
) ON CONFLICT (id) DO NOTHING;

-- Seed SEO Settings
INSERT INTO public.seo_settings (page_key, title, description, keywords, og_image, favicon, canonical_url)
VALUES 
('home', 'Intellect Circle - Youth Learning Community in Punjab', 'A refined, selective, and structured intellectual circle for youth in Punjab, Pakistan. Share knowledge, engage in deep discussions, and grow together.', 'youth community, punjab, learning circle, deep talk, peer education', '', '/favicon.ico', ''),
('about', 'Our Identity & Mission - Intellect Circle', 'Explore our vision, core values, history, and what makes Intellect Circle a unique peer-led intellectual community for youth.', 'mission, values, founder story, intellect circle history', '', '/favicon.ico', ''),
('sessions', 'Sessions & Recap Blog - Intellect Circle', 'Stay updated on upcoming presentations, browse past session archives, and read recap articles of our structured peer talks.', 'presentations, speech, game theory, neural plasticity, macroeconomics', '', '/favicon.ico', ''),
('team', 'Meet the Core Leadership - Intellect Circle', 'Meet the dedicated youth steering Intellect Circle: President, Operations, Media, Impact, and Core Members.', 'president, operations, design team, punjab youth leadership', '', '/favicon.ico', ''),
('apply', 'Join Our Community - Intellect Circle Application', 'Apply to join Intellect Circle. We look for serious, motivated youth aged 17-30 in Punjab, Pakistan.', 'apply membership, application form, Lahore youth cohort', '', '/favicon.ico', ''),
('contact', 'Get in Touch - Intellect Circle', 'Reach out to the Intellect Circle team. Submit contact inquiries or find our social media handles and email address.', 'contact email, whatsapp number, address, social media links', '', '/favicon.ico', '')
ON CONFLICT (page_key) DO NOTHING;

-- Seed Contact Settings
INSERT INTO public.contact_settings (id, email, whatsapp, address)
VALUES (1, 'intellectcircle.official4@gmail.com', '', 'Punjab, Pakistan')
ON CONFLICT (id) DO NOTHING;

-- Seed Social Links
INSERT INTO public.social_links (id, instagram, linkedin, facebook, twitter)
VALUES (1, 'https://instagram.com/intellectcircle', 'https://www.linkedin.com/company/intellect-circle/', 'https://www.facebook.com/profile.php?id=61590726385267', '')
ON CONFLICT (id) DO NOTHING;

-- Seed Statistics
INSERT INTO public.statistics (key, label, value, sort_order)
VALUES 
('members', 'Members', '78', 1),
('sessions', 'Sessions Held', '36', 2),
('topics', 'Topics Covered', '28', 3),
('cities', 'Cities Reached', '4', 4)
ON CONFLICT (key) DO NOTHING;

-- Seed About Teaser Columns
INSERT INTO public.about_teaser_columns (title, description, sort_order)
VALUES 
('What We Do', 'Members meet for structured one-hour sessions where they share insights from their areas of expertise.', 1),
('How We Meet', 'Four sessions monthly. Alternating formats: interactive discussions and deep-dive presentations with Q&A.', 2),
('Why It Matters', 'To bridge fields of study, master public speaking, and surround ourselves with driven peers.', 3);

-- Seed How It Works Steps
INSERT INTO public.how_it_works_steps (number, text, sort_order)
VALUES 
('01', 'Propose a topic you want to present.', 1),
('02', 'Punjab core team reviews and structures the session.', 2),
('03', 'Host the talk, lead the Q&A, and publish the recap.', 3);

-- Seed Pillars
INSERT INTO public.pillars (name, description, status, sort_order)
VALUES 
('Knowledge Sessions', 'Structured peer talks and presentations across multiple disciplines.', 'Live', 1),
('Volunteer Projects', 'Community outreach, development campaigns, and civic service.', 'Coming Soon', 2),
('Skill Development', 'Workshops in communication, research methods, and software systems.', 'Live', 3),
('Problem Solving Group', 'Practical ideation sessions tackling hyper-local community challenges.', 'Coming Soon', 4),
('Physical Activities & Sports', 'Regular meetups for athletics, hiking, and team builders.', 'Coming Soon', 5),
('Voice of Youth', 'Public rhetoric forums and debate panels voicing regional needs.', 'Coming Soon', 6);

-- Seed Geographic Levels
INSERT INTO public.geographic_levels (label, active, sort_order)
VALUES 
('Street', true, 1),
('Sector', true, 2),
('Town', true, 3),
('City', true, 4),
('Province', false, 5),
('National', false, 6);

-- Seed About Values
INSERT INTO public.about_values (icon, title, description, sort_order)
VALUES 
('book', 'Intellect Rigor', 'We choose substance over superficiality. Every session is researched and structured.', 1),
('users', 'Peer-to-Peer Growth', 'Every member is both a teacher and a student. We learn from each other''s diverse domains.', 2),
('clock', 'Respect for Structure', 'We value time. Our 60-minute sessions start, run, and end precisely as scheduled.', 3);

-- Seed About Differences
INSERT INTO public.about_differences (title, description, sort_order)
VALUES 
('Strict Time Limits', '60 minutes, zero filler. Every second of our sessions is optimized for learning.', 1),
('Diverse Domains', 'From quantum mechanics to medieval poetry, our presentations cross all academic and professional fields.', 2),
('Selective Peer Network', 'We screen all applicants to maintain a highly motivated, curious, and respectful community.', 3),
('No Passive Listeners', 'Every member must present their area of expertise. Contribution is a prerequisite.', 4);

-- Seed Team Members
INSERT INTO public.team_members (name, role, bio, photo, skills, sort_order, is_visible)
VALUES 
('Ahmad Yasin', 'Founder & President, Intellect Circles', 'Clinical Psychology student passionate about human behavior, critical thinking, and youth empowerment.', '/uploads/Photo_004.png', '["Psychology", "Research", "Leadership"]'::jsonb, 1, true),
('Muhammad Rehan', 'Head of Operations', 'Software engineer dedicated to structured operational design and community growth.', '', '["Systems Design", "Project Mgmt", "Research"]'::jsonb, 2, true),
('Hamdan', 'Head of Media', 'Visual designer and writer focusing on storytelling and clean digital presentation.', '', '["Visual Design", "Creative Writing", "Media"]'::jsonb, 3, true),
('Muhammad Juanid', 'Head of Growth & Impact', 'Development specialist working on extending youth access to learning platforms across Punjab.', '', '["Community Growth", "Impact Strategy", "Youth Access"]'::jsonb, 4, true);

-- Seed Sessions
INSERT INTO public.sessions (title, presenter, scheduled_at, time, format, summary, status, photo, takeaways, registration_link)
VALUES 
('An Introduction to Modern Game Theory', 'Ahmad Yasin', '2026-07-12 18:00:00+05', '18:00 PKT', '30min talk + Q&A', 'Exploring strategic interaction, Nash equilibria, and how mathematical models help us understand conflict and cooperation in daily life.', 'upcoming', '/uploads/An Introduction to Modern Game Theory.png', '[]'::jsonb, ''),
('The Science of Neural Plasticity', 'Zainab Shah', '2026-06-25 18:00:00+05', '18:00 PKT', 'Interactive discussion', 'How our brains structurally reorganize in response to learning, habit formation, and trauma, with practical applications for cognitive enhancement.', 'completed', '', '["Synaptic Pruning - The brain strengthens used pathways and prunes others.", "Focus as Catalyst - Attention marks active synapses for modification.", "Rest is Required - Learning processes solidify during deep sleep."]'::jsonb, ''),
('Deciphering Macroeconomics in Developing Nations', 'Fatima Ali', '2026-06-11 18:00:00+05', '18:00 PKT', '30min talk + Q&A', 'Analyzing inflation, foreign reserves, and fiscal deficits with a specific focus on structural reforms in Pakistan''s economy.', 'completed', '', '[]'::jsonb, '');

-- Seed Blog Recaps
INSERT INTO public.blog (title, published_at, author, excerpt, content)
VALUES 
(
    'Neural Plasticity: Re-wiring the Mind for Continuous Learning', 
    '2026-06-27 12:00:00+05', 
    'Zainab Shah', 
    'A deep dive recap of our 35th session, detailing how neural pathways form and how we can systematically optimize our cognitive focus.',
    'During our most recent session, we explored the fascinating world of neuroscience, focusing on neural plasticity. For years, the scientific consensus was that the adult brain was relatively fixed. We now know this is incorrect: the brain retains its capacity to adapt and change throughout our lives.

### Key Takeaways
1. **Synaptic Pruning**: The brain eliminates pathways that are not actively used, while strengthening those that are reinforced. Consistent practice is literally structural architecture.
2. **The Role of Focus**: High attention triggers the release of acetylcholine, a neurotransmitter that marks active synapses for modification.
3. **Rest as a Catalyst**: While learning occurs during high-focus states, actual structural changes (myelination) take place during deep sleep and recovery.

Our members engaged in a lively Q&A session discussing how these principles apply to breaking bad habits and mastering complex professional skillsets in short timeframes.'
),
(
    'Economic Reforms: Understanding the Deficit Challenge', 
    '2026-06-13 12:00:00+05', 
    'Fatima Ali', 
    'A summary of our macroeconomic analysis session, breaking down Pakistan''s current fiscal hurdles in plain English.',
    'Macroeconomics is often viewed as dry, but when applied to the current economic landscape of Pakistan, it becomes a crucial study of our collective future. Our 34th session broke down fiscal policy, IMF packages, and structural reforms.

We discussed the difference between balance of trade deficits and fiscal deficits, how currency devaluation affects local manufacturing, and the role of youth entrepreneurship in expanding the tax base.

The session concluded with a debate on policy priorities: should the state focus on export incentives, or should it prioritize aggressive tax collection restructuring? The diversity of views among our members: from economics graduates to engineers, highlighted the strength of Intellect Circle''s cross-disciplinary approach.'
);

-- -------------------------------------------------------------
-- 7. NEW FEATURES: CERTIFICATES & VISITOR ANALYTICS
-- -------------------------------------------------------------

-- Signature & Promotional Column Settings in Site Settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS authorized_signature_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_name TEXT DEFAULT 'Ahmad Yasin';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_title TEXT DEFAULT 'President, Intellect Circle';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_signature_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_name TEXT DEFAULT 'Zainab Shah';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_title TEXT DEFAULT 'Vice President, Intellect Circle';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_signature_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS promotion_notice TEXT DEFAULT 'Verified Intellect Circle digital certificates are provided free of charge for this session as part of our launch promotion.';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS promotion_notice_enabled BOOLEAN DEFAULT TRUE;

-- Certificate layout adjustments (pixel coordinates relative to 3509 x 2480 template)
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

-- Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY, -- Certificate ID, e.g. 'IC-2026-XXXXX'
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    program_name TEXT NOT NULL,
    completion_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
    is_paid BOOLEAN DEFAULT FALSE,
    price NUMERIC(10, 2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Certificates
DROP POLICY IF EXISTS "Allow anonymous read access to certificates" ON public.certificates;
CREATE POLICY "Allow anonymous read access to certificates" ON public.certificates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated admins full access to certificates" ON public.certificates;
CREATE POLICY "Allow authenticated admins full access to certificates" ON public.certificates
    FOR ALL USING (true);

-- RLS Policies for Analytics Events
DROP POLICY IF EXISTS "Allow anonymous insert access to analytics_events" ON public.analytics_events;
CREATE POLICY "Allow anonymous insert access to analytics_events" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated admins select access to analytics_events" ON public.analytics_events;
CREATE POLICY "Allow authenticated admins select access to analytics_events" ON public.analytics_events
    FOR SELECT USING (true);

-- Reload Supabase PostgREST API schema cache
NOTIFY pgrst, 'reload schema';


