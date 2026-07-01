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
    const contactMsg = req.body;
    if (!contactMsg) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    // Insert contact inquiry row
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/submissions`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        type: 'contact',
        name: contactMsg.name,
        email: contactMsg.email,
        message: contactMsg.message,
        created_at: contactMsg.submittedAt || new Date().toISOString()
      })
    });

    if (!insertRes.ok) {
      const errorText = await insertRes.text();
      throw new Error(`Supabase insert failed: ${errorText}`);
    }

    return res.status(200).json({ success: true, message: 'Contact inquiry submitted successfully' });
  } catch (error) {
    console.error('Error submitting contact to Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
}
