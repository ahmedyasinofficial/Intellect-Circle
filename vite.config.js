import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom local database persistence plugin for CMS in development
const localDbPlugin = () => ({
  name: 'local-db-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url.split('?')[0];

      if (req.method === 'GET' && url === '/api/get-data') {
        try {
          const dataPath = path.resolve(__dirname, 'src/data.json');
          const content = fs.readFileSync(dataPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(content);
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      } else if (req.method === 'POST' && url === '/api/login') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { email, password } = JSON.parse(body);
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (email === data.admin.email) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                session: { access_token: 'mock-session-token-12345' },
                user: { id: 'mock-user-id', email }
              }));
            } else {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid email or password.' }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (req.method === 'POST' && (url === '/api/save-data' || url === '/api/settings')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            
            // Merge settings
            const merged = { ...data, ...payload };
            delete merged.submissions;
            
            fs.writeFileSync(dataPath, JSON.stringify(merged, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Settings saved to local data.json' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else if (url === '/api/team') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data.team) data.team = [];

            if (req.method === 'POST') {
              const item = JSON.parse(body);
              item.id = 'team-' + Date.now();
              data.team.push(item);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: item }));
            } else if (req.method === 'PUT') {
              const payload = JSON.parse(body);
              if (payload.reorder) {
                const newTeam = payload.reorder.map(id => data.team.find(t => t.id === id)).filter(Boolean);
                data.team = newTeam;
              } else {
                data.team = data.team.map(t => t.id === payload.id ? { ...t, ...payload } : t);
              }
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } else if (req.method === 'DELETE') {
              const { id } = JSON.parse(body);
              data.team = data.team.filter(t => t.id !== id);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (url === '/api/sessions') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data.sessions) data.sessions = [];

            if (req.method === 'POST') {
              const item = JSON.parse(body);
              item.id = 'session-' + Date.now();
              item.isUpcoming = item.status === 'upcoming';
              data.sessions.push(item);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: item }));
            } else if (req.method === 'PUT') {
              const payload = JSON.parse(body);
              payload.isUpcoming = payload.status === 'upcoming';
              data.sessions = data.sessions.map(s => s.id === payload.id ? { ...s, ...payload } : s);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } else if (req.method === 'DELETE') {
              const { id } = JSON.parse(body);
              data.sessions = data.sessions.filter(s => s.id !== id);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (url === '/api/blog') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data.blog) data.blog = [];

            if (req.method === 'POST') {
              const item = JSON.parse(body);
              item.id = 'blog-' + Date.now();
              data.blog.push(item);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: item }));
            } else if (req.method === 'PUT') {
              const payload = JSON.parse(body);
              data.blog = data.blog.map(b => b.id === payload.id ? { ...b, ...payload } : b);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } else if (req.method === 'DELETE') {
              const { id } = JSON.parse(body);
              data.blog = data.blog.filter(b => b.id !== id);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (url === '/api/media') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data.media) data.media = [];

            if (req.method === 'GET') {
              const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              const search = parsedUrl.searchParams.get('search');
              let results = data.media || [];
              if (search) {
                results = results.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(results));
            } else if (req.method === 'POST') {
              const item = JSON.parse(body);
              item.id = 'media-' + Date.now();
              data.media.push(item);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: item }));
            } else if (req.method === 'DELETE') {
              const { id } = JSON.parse(body);
              data.media = data.media.filter(m => m.id !== id);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (url === '/api/activity-log') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data.activity_logs) data.activity_logs = [
              { id: '1', user_email: 'admin@intellectcircle.com', action: 'Update Settings', details: 'SEO and contacts saved.', created_at: new Date(Date.now() - 3600000).toISOString() },
              { id: '2', user_email: 'admin@intellectcircle.com', action: 'Create Session', details: 'Added Intro to modern game theory.', created_at: new Date(Date.now() - 7200000).toISOString() }
            ];

            if (req.method === 'GET') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data.activity_logs));
            } else if (req.method === 'POST') {
              const { action, details } = JSON.parse(body || '{}');
              const newLog = {
                id: 'log-' + Date.now(),
                user_email: 'admin@intellectcircle.com',
                action: action || 'Unknown Action',
                details: details || '',
                created_at: new Date().toISOString()
              };
              data.activity_logs.unshift(newLog);
              // Trim to last 100 entries
              if (data.activity_logs.length > 100) data.activity_logs = data.activity_logs.slice(0, 100);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: newLog }));
            } else {
              res.writeHead(405, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Method not allowed' }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (req.method === 'POST' && url === '/api/submit-application') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const application = JSON.parse(body);
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const dataContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!dataContent.submissions) dataContent.submissions = { applications: [], contacts: [] };
            if (!dataContent.submissions.applications) dataContent.submissions.applications = [];
            dataContent.submissions.applications.unshift(application);
            fs.writeFileSync(dataPath, JSON.stringify(dataContent, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Application submitted successfully' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else if (req.method === 'POST' && url === '/api/submit-contact') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const contactMsg = JSON.parse(body);
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const dataContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!dataContent.submissions) dataContent.submissions = { applications: [], contacts: [] };
            if (!dataContent.submissions.contacts) dataContent.submissions.contacts = [];
            dataContent.submissions.contacts.unshift(contactMsg);
            fs.writeFileSync(dataPath, JSON.stringify(dataContent, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Contact inquiry submitted successfully' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else if (req.method === 'POST' && url === '/api/delete-submission') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { id } = JSON.parse(body);
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const dataContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (dataContent.submissions) {
              if (dataContent.submissions.applications) {
                dataContent.submissions.applications = dataContent.submissions.applications.filter(a => a.id !== id);
              }
              if (dataContent.submissions.contacts) {
                dataContent.submissions.contacts = dataContent.submissions.contacts.filter(c => c.id !== id);
              }
            }
            fs.writeFileSync(dataPath, JSON.stringify(dataContent, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Submission deleted successfully' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else if (req.method === 'POST' && url === '/api/upload-image') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const { fileName, base64Data } = payload;
            const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Content, 'base64');
            const uploadDir = path.resolve(__dirname, 'public/uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const destPath = path.resolve(uploadDir, fileName);
            fs.writeFileSync(destPath, buffer);
            
            // Add metadata to local data.json media array for mock Library
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data.media) data.media = [];
            
            const mediaId = 'media-' + Date.now();
            const mediaItem = {
              id: mediaId,
              name: fileName,
              url: `/uploads/${fileName}`,
              size: buffer.length,
              mime_type: 'image/png'
            };
            data.media.unshift(mediaItem);
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              url: `/uploads/${fileName}`,
              name: fileName,
              size: buffer.length,
              mime_type: 'image/png',
              id: mediaId
            }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), localDbPlugin()],
})

