import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;
  if (!action || !['submit-application', 'submit-contact', 'delete-submission'].includes(action)) {
    return res.status(400).json({ error: 'Invalid or missing action parameter.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ success: true, message: 'Submission action mocked successfully' });
  }

  try {
    if (action === 'submit-application') {
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
    }

    if (action === 'submit-contact') {
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
    }

    if (action === 'delete-submission') {
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
    }
  } catch (error) {
    console.error(`Submissions action ${action} failed:`, error);
    return res.status(500).json({ error: error.message });
  }
}
