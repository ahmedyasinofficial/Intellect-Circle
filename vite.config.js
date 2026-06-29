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
      if (req.method === 'POST' && req.url === '/api/save-data') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            // Verify payload is JSON
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
      } else if (req.method === 'POST' && req.url === '/api/upload-image') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const { fileName, base64Data } = payload;
            
            // Extract base64 content
            const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Content, 'base64');
            
            // Create uploads directory if it doesn't exist
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

