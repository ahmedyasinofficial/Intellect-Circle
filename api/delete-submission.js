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
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Missing submission ID' });
    }

    // Delete submission row
    const deleteRes = await fetch(`${supabaseUrl}/rest/v1/submissions?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      throw new Error(`Supabase delete failed: ${errorText}`);
    }

    return res.status(200).json({ success: true, message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission from Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
}
