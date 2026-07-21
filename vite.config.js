import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function sendWelcomeEmailLocal({ name, email }) {
  const mailSubject = `Welcome to the Intellect Circle Community!`;
  const mailText = `Dear ${name},

Welcome to the Intellect Circle community! We are excited to have you on board.

To get started, please join our WhatsApp Community using the link below:
https://chat.whatsapp.com/GQEEjulFJLJ6FjHfacdQie?s=cl&p=a&ilr=1&amv=1

Stay connected and follow our social media pages:
- Instagram: https://instagram.com/intellectcircle
- LinkedIn: https://www.linkedin.com/company/intellect-circle/
- Facebook: https://www.facebook.com/profile.php?id=61590726385267

Best regards,
Intellect Circle Team
https://intellectcircle.dpdns.org`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@intellectcircle.dpdns.org';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"Intellect Circle" <${smtpFrom}>`,
        to: email,
        subject: mailSubject,
        text: mailText
      });
      console.log(`[Local Welcome Email] Sent welcome email to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`[Local Welcome Email] SMTP error sending to ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  } else {
    const msg = `[Local Welcome Email Simulation] SMTP not configured. Welcomed ${name} (${email}).`;
    console.log(msg);
    return { success: true, simulated: true };
  }
}

async function sendReceiptEmailLocal({ name, email }) {
  const mailSubject = `Application Received - Intellect Circle`;
  const mailText = `Dear ${name},

Thank you for your application to join Intellect Circle. We have received your submission, and our team is currently reviewing it.

Our weekly review process ensures we maintain a focused and high-signal community. We will be in touch with you shortly regarding the next steps, which may include a brief introductory call.

Please check your spam folder if you do not receive further updates from us, and ensure to mark our emails as safe.

Best regards,
Intellect Circle Team
https://intellectcircle.dpdns.org`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@intellectcircle.dpdns.org';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"Intellect Circle" <${smtpFrom}>`,
        to: email,
        subject: mailSubject,
        text: mailText
      });
      console.log(`[Local Receipt Email] Sent application receipt email to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`[Local Receipt Email] SMTP error sending to ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  } else {
    const msg = `[Local Receipt Email Simulation] SMTP not configured. Acknowledged application for ${name} (${email}).`;
    console.log(msg);
    return { success: true, simulated: true };
  }
}

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
      } else if (req.method === 'POST' && url === '/api/settings') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

            // Merge settings (safely merging admin object recursively)
            const merged = { ...data, ...payload };
            if (data.admin && payload.admin) {
              merged.admin = { ...data.admin, ...payload.admin };
            }
            delete merged.submissions;

            fs.writeFileSync(dataPath, JSON.stringify(merged, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Settings saved to local data.json' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else if (url === '/api/content') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const type = parsedUrl.searchParams.get('type');
            if (!type || !['team', 'sessions', 'blog'].includes(type)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid or missing type parameter.' }));
              return;
            }

            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data[type]) data[type] = [];

            if (req.method === 'GET') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data[type]));
            } else if (req.method === 'POST') {
              const item = JSON.parse(body);
              item.id = `${type}-` + Date.now();
              if (type === 'sessions') {
                item.isUpcoming = item.status === 'upcoming';
              }
              data[type].push(item);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: item }));
            } else if (req.method === 'PUT') {
              const payload = JSON.parse(body);
              if (type === 'team' && payload.reorder) {
                const newTeam = payload.reorder.map(id => data.team.find(t => t.id === id)).filter(Boolean);
                data.team = newTeam;
              } else {
                if (type === 'sessions') {
                  payload.isUpcoming = payload.status === 'upcoming';
                }
                data[type] = data[type].map(t => t.id === payload.id ? { ...t, ...payload } : t);
              }
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } else if (req.method === 'DELETE') {
              const { id } = JSON.parse(body);
              data[type] = data[type].filter(t => t.id !== id);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (url === '/api/submissions') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const action = parsedUrl.searchParams.get('action');
            if (!action || !['submit-application', 'submit-contact', 'delete-submission'].includes(action)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid or missing action parameter.' }));
              return;
            }

            const dataPath = path.resolve(__dirname, 'src/data.json');
            const dataContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!dataContent.submissions) dataContent.submissions = { applications: [], contacts: [] };

            if (action === 'submit-application') {
              const application = JSON.parse(body);
              application.welcome_email_status = 'pending';
              application.welcome_email_send_after = new Date(Date.now() + 3600 * 1000).toISOString();

              if (!dataContent.submissions.applications) dataContent.submissions.applications = [];
              dataContent.submissions.applications.unshift(application);
              fs.writeFileSync(dataPath, JSON.stringify(dataContent, null, 2), 'utf-8');

              // Setup 1-hour setTimeout to simulate sending the email
              setTimeout(() => {
                sendWelcomeEmailLocal({ name: application.name, email: application.email })
                  .then((res) => {
                    try {
                      const updatedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
                      const foundApp = updatedData.submissions.applications.find(a => a.id === application.id || (a.email === application.email && a.name === application.name));
                      if (foundApp) {
                        foundApp.welcome_email_status = res.success ? 'sent' : 'failed';
                        foundApp.welcome_email_sent_at = new Date().toISOString();
                        fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2), 'utf-8');
                      }
                    } catch (err) {
                      console.error('Failed to update email status in data.json:', err.message);
                    }
                  })
                  .catch(console.error);
              }, 3600000); // 1 hour

              // Send local auto-acknowledgement / receipt email immediately
              sendReceiptEmailLocal({ name: application.name, email: application.email }).catch(console.error);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Application submitted successfully' }));
            } else if (action === 'submit-contact') {
              const contactMsg = JSON.parse(body);
              if (!dataContent.submissions.contacts) dataContent.submissions.contacts = [];
              dataContent.submissions.contacts.unshift(contactMsg);
              fs.writeFileSync(dataPath, JSON.stringify(dataContent, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Contact inquiry submitted successfully' }));
            } else if (action === 'delete-submission') {
              const { id } = JSON.parse(body);
              if (dataContent.submissions.applications) {
                dataContent.submissions.applications = dataContent.submissions.applications.filter(a => a.id !== id);
              }
              if (dataContent.submissions.contacts) {
                dataContent.submissions.contacts = dataContent.submissions.contacts.filter(c => c.id !== id);
              }
              fs.writeFileSync(dataPath, JSON.stringify(dataContent, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Submission deleted successfully' }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else if (url === '/api/media') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const action = parsedUrl.searchParams.get('action');
            const search = parsedUrl.searchParams.get('search');

            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data.media) data.media = [];

            if (req.method === 'GET') {
              let results = data.media || [];
              if (search) {
                results = results.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(results));
            } else if (req.method === 'POST') {
              if (action === 'upload') {
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
              } else {
                const item = JSON.parse(body);
                item.id = 'media-' + Date.now();
                data.media.push(item);
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: item }));
              }
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
      } else if (url === '/api/analytics') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            if (req.method === 'POST') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } else {
              // Return mock analytics report
              const mockDays = [];
              const now = new Date();
              for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                mockDays.push({
                  date: d.toLocaleDateString('en-US', { weekday: 'short' }),
                  views: Math.floor(Math.random() * 80) + 20
                });
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                pageViews: 1240,
                uniqueVisitors: 412,
                chartData: mockDays
              }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (url === '/api/certificates') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const id = parsedUrl.searchParams.get('id');
            const action = parsedUrl.searchParams.get('action');

            const dataPath = path.resolve(__dirname, 'src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (!data.certificates) data.certificates = [];

            if (req.method === 'GET') {
              if (action === 'download-pdf') {
                (async () => {
                  try {
                    const { default: handler } = await import('./api/certificates.js');
                    const query = {};
                    for (const [key, val] of parsedUrl.searchParams.entries()) {
                      query[key] = val;
                    }
                    req.query = query;
                    if (!req.body) req.body = body ? JSON.parse(body) : {};

                    // Add Express-compatible response helpers that preserve setHeader() calls
                    if (!res.status) {
                      res.status = (code) => {
                        res.statusCode = code;
                        return res;
                      };
                    }
                    if (!res.json) {
                      res.json = (d) => {
                        if (!res.headersSent) {
                          res.setHeader('Content-Type', 'application/json');
                          res.writeHead(res.statusCode || 200);
                        }
                        res.end(JSON.stringify(d));
                        return res;
                      };
                    }
                    if (!res.send) {
                      res.send = (dataContent) => {
                        if (!res.headersSent) {
                          if (Buffer.isBuffer(dataContent)) {
                            if (!res.getHeader('Content-Type')) {
                              res.setHeader('Content-Type', 'application/octet-stream');
                            }
                            res.setHeader('Content-Length', dataContent.length);
                          } else if (typeof dataContent === 'object') {
                            res.setHeader('Content-Type', 'application/json');
                            dataContent = JSON.stringify(dataContent);
                          }
                          // writeHead with no explicit headers — uses all headers set via setHeader()
                          res.writeHead(res.statusCode || 200);
                        }
                        res.end(dataContent);
                        return res;
                      };
                    }

                    await handler(req, res);
                  } catch (err) {
                    console.error('[Vite PDF Proxy] Error:', err);
                    if (!res.headersSent) {
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                    }
                    res.end(JSON.stringify({ error: err.message }));
                  }
                })();
              } else if (id) {
                const cert = data.certificates.find(c => c.id === id);
                if (cert) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(cert));
                } else {
                  res.writeHead(404, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Certificate not found' }));
                }
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data.certificates));
              }
            } else if (req.method === 'POST') {
              const payload = JSON.parse(body);
              if (payload.action === 'resend-email') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Email successfully resent (mock simulation)' }));
                return;
              }
              const year = new Date(payload.completion_date).getFullYear() || new Date().getFullYear();
              const uniqueSuffix = Date.now().toString().slice(-6);
              const certId = `IC-${year}-${uniqueSuffix}`;

              const newCert = {
                id: certId,
                recipient_name: payload.recipient_name,
                recipient_email: payload.recipient_email,
                program_name: payload.program_name,
                completion_date: payload.completion_date,
                status: 'valid',
                is_paid: !!payload.is_paid,
                price: payload.price || 0.00,
                payment_status: payload.payment_status || 'free',
                created_at: new Date().toISOString()
              };
              data.certificates.unshift(newCert);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: newCert }));
            } else if (req.method === 'PATCH') {
              const { id: updateId, status } = JSON.parse(body);
              data.certificates = data.certificates.map(c => c.id === updateId ? { ...c, status } : c);
              fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (url === '/api/setup-db') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status: 'configured', message: 'Offline development mode: Database auto-configured.' }));
      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  base: '/',
  plugins: [react(), localDbPlugin()],
})

