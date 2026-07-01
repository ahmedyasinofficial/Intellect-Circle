export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase configuration missing on server side.' });
  }

  try {
    const application = req.body;
    if (!application) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    // Insert application row
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/submissions`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        type: 'application',
        name: application.name,
        email: application.email,
        age: parseInt(application.age, 10) || null,
        city: application.city,
        occupation: application.occupation,
        why_join: application.whyJoin,
        heard_about: application.heardAboutCombined,
        created_at: application.submittedAt || new Date().toISOString()
      })
    });

    if (!insertRes.ok) {
      const errorText = await insertRes.text();
      throw new Error(`Supabase insert failed: ${errorText}`);
    }

    return res.status(200).json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Error submitting application to Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
}
