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
      if (req.method === 'GET' && req.url === '/api/get-data') {
        try {
          const dataPath = path.resolve(__dirname, 'src/data.json');
          const content = fs.readFileSync(dataPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(content);
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      } else if (req.method === 'POST' && req.url === '/api/save-data') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            JSON.parse(body);
            const dataPath = path.resolve(__dirname, 'src/data.json');
            fs.writeFileSync(dataPath, body, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Data saved successfully to disk' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else if (req.method === 'POST' && req.url === '/api/submit-application') {
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
      } else if (req.method === 'POST' && req.url === '/api/submit-contact') {
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
      } else if (req.method === 'POST' && req.url === '/api/delete-submission') {
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
      } else if (req.method === 'POST' && req.url === '/api/upload-image') {
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
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, url: `/uploads/${fileName}` }));
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

