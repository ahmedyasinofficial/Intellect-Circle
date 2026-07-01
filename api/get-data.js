import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load fallback default data using fs (compatible with all Node.js runtimes)
let defaultData = {};
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const jsonPath = join(__dirname, '..', 'src', 'data.json');
  defaultData = JSON.parse(readFileSync(jsonPath, 'utf-8'));
} catch (e) {
  // Fallback: empty structure if file can't be read (e.g. on Vercel where src/ isn't bundled)
  defaultData = { submissions: { applications: [], contacts: [] } };
}

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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // If not configured, fall back to default data JSON structure (local development mode)
    return res.status(200).json(defaultData);
  }

  try {
    // 1. Fetch website config from Supabase
    const configRes = await fetch(`${supabaseUrl}/rest/v1/configs?id=eq.1&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    let configData = defaultData;
    if (configRes.ok) {
      const rows = await configRes.json();
      if (rows && rows.length > 0) {
        configData = rows[0].content;
      }
    }

    // 2. Fetch submissions from Supabase
    const submissionsRes = await fetch(`${supabaseUrl}/rest/v1/submissions?select=*&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const applications = [];
    const contacts = [];

    if (submissionsRes.ok) {
      const rows = await submissionsRes.json();
      for (const row of rows) {
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
      }
    }

    // 3. Assemble unified response
    const finalData = {
      ...configData,
      submissions: {
        applications,
        contacts
      }
    };

    return res.status(200).json(finalData);
  } catch (error) {
    console.error('Error fetching data from Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
}
