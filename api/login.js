import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Allow CORS if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, password } = req.body;
    
    // Check against data.json admin credentials
    const dataPath = path.resolve(process.cwd(), 'src/data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    if (email === data.admin.email) {
      return res.status(200).json({
        success: true,
        session: { access_token: 'mock-session-token-12345' },
        user: { id: 'mock-user-id', email }
      });
    } else {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('Login API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
