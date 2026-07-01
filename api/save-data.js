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
    const updatedData = req.body;
    if (!updatedData) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    // Strip submissions so they are not saved in the configs table
    const { submissions, ...configOnly } = updatedData;

    // We use an upsert: update config with ID 1
    const saveRes = await fetch(`${supabaseUrl}/rest/v1/configs`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 1,
        content: configOnly
      })
    });

    if (!saveRes.ok) {
      const errorText = await saveRes.text();
      throw new Error(`Supabase upsert failed: ${errorText}`);
    }

    return res.status(200).json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving data to Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
}
