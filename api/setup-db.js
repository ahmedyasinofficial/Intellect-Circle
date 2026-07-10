import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseActive = !!(supabaseUrl && supabaseKey);

  // Return schema copyable SQL instructions by default
  const sqlSchema = `-- Run the following SQL in your Supabase SQL Editor:

-- 1. Create Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY,
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

-- 2. Add columns to site_settings if they don't exist
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_name TEXT DEFAULT 'Ahmad Yasin';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_title TEXT DEFAULT 'President, Intellect Circle';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS president_signature_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_name TEXT DEFAULT 'Zainab Shah';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_title TEXT DEFAULT 'Vice President, Intellect Circle';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS vice_president_signature_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS promotion_notice TEXT DEFAULT 'Verified Intellect Circle digital certificates are provided free of charge for this session as part of our launch promotion.';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS promotion_notice_enabled BOOLEAN DEFAULT TRUE;

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

  // Check if certificates table exists
  let certificatesTableExists = false;
  let errorMsg = '';
  try {
    const { error } = await supabase.from('certificates').select('id').limit(1);
    if (!error) {
      certificatesTableExists = true;
    } else {
      errorMsg = error.message;
      // PGRST116 is single row empty / ok, but missing relation is:
      // "relation \"public.certificates\" does not exist"
      if (error.code === 'PGRST116') {
        certificatesTableExists = true;
      }
    }
  } catch (err) {
    errorMsg = err.message;
  }

  // Attempt auto-setup if POST method and PG connection string is available
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
