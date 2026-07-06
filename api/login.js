import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

let adminEmail = 'admin@intellectcircle.com';
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dataPath = join(__dirname, '..', 'src', 'data.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  adminEmail = data.admin?.email || adminEmail;
} catch (e) {
  // Keep default
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Simple email-based check (password verified client-side against data.json admin entry)
    if (email === adminEmail) {
      return res.status(200).json({
        success: true,
        session: { access_token: 'mock-session-token-12345' },
        user: { id: 'mock-admin-id', email }
      });
    } else {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('Login API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
