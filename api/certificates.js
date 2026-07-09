import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, logActivity } from './_auth-middleware.js';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

// Helper to fetch an image as buffer
async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch image');
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn(`[PDF Generator] Failed to fetch image at ${url}:`, err.message);
    return null;
  }
}

// Helper to send the certificate email
async function sendCertificateEmail({ recipient_name, recipient_email, program_name, verifyUrl, pdfBuffer, certificateId }) {
  const mailSubject = `Intellect Circle Completion Certificate: ${program_name}`;
  const mailText = `Dear ${recipient_name},

Congratulations on completing the program "${program_name}" conducted by Intellect Circle.

Please find your official Digital Certificate attached to this email.

You can verify the authenticity of this certificate at any time using the following link:
${verifyUrl}

Certificate ID: ${certificateId}

Best regards,
Intellect Circle Team
https://intellectcircle.dpdns.org`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'no-reply@intellectcircle.dpdns.org';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
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
        to: recipient_email,
        subject: mailSubject,
        text: mailText,
        attachments: [
          {
            filename: `Intellect_Circle_Certificate_${certificateId}.pdf`,
            content: pdfBuffer
          }
        ]
      });

      console.log(`[Email Service] Successfully sent email to ${recipient_email} for certificate ${certificateId}`);
      return { success: true, method: 'smtp' };
    } catch (error) {
      console.error('[Email Service] SMTP error sending certificate:', error.message);
      return { success: false, error: error.message };
    }
  } else {
    // Return mock log response
    const msg = `[Email Simulation] SMTP not configured. Logged email for ${recipient_email}. ID: ${certificateId}. Link: ${verifyUrl}`;
    console.log(msg);
    return { success: true, method: 'simulation', message: msg };
  }
}

// Generate the landscape PDF certificate using the official template image
async function generateCertificatePdf(certificate, settings, verifyUrl, req) {
  const host = req.headers.host || 'localhost';
  const protocol = req.headers.referer?.split('://')[0] || 'https';
  const baseUrl = `${protocol}://${host}`;

  // Template image URL (public/CERTIFICATE OF COMPLETION.png)
  const templateUrl = `${baseUrl}/CERTIFICATE%20OF%20COMPLETION.png`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;

  // Fetch all images BEFORE building the PDF to prevent blank PDFs
  const fetchPromises = [
    fetchImageBuffer(templateUrl),
    fetchImageBuffer(qrUrl)
  ];

  const presSigUrl = settings.president_signature_url;
  if (presSigUrl) {
    const absUrl = presSigUrl.startsWith('http') ? presSigUrl : `${baseUrl}${presSigUrl}`;
    fetchPromises.push(fetchImageBuffer(absUrl));
  } else {
    fetchPromises.push(Promise.resolve(null));
  }

  const vpSigUrl = settings.vice_president_signature_url;
  if (vpSigUrl) {
    const absUrl = vpSigUrl.startsWith('http') ? vpSigUrl : `${baseUrl}${vpSigUrl}`;
    fetchPromises.push(fetchImageBuffer(absUrl));
  } else {
    fetchPromises.push(Promise.resolve(null));
  }

  const [templateBuffer, qrBuffer, presSigBuffer, vpSigBuffer] = await Promise.all(fetchPromises);

  return new Promise((resolve, reject) => {
    try {
      // A4 Landscape: 842 x 595 points
      const pageW = 842;
      const pageH = 595;

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // --- STEP 1: Draw the template image as full-page background ---
      if (templateBuffer) {
        doc.image(templateBuffer, 0, 0, { width: pageW, height: pageH });
      } else {
        // Fallback: white background if template fails to load
        doc.rect(0, 0, pageW, pageH).fill('#FFFFFF');
      }

      // --- STEP 2: Overlay dynamic text at placeholder positions ---
      // Colors matching the template design
      const goldColor = '#B8972F';
      const darkColor = '#2D3748';
      const grayColor = '#4A5568';

      // Recipient name — positioned at the {{RECIPIENT_NAME}} placeholder
      // Template: ~40% from top, centered
      doc.fillColor(goldColor)
         .fontSize(34)
         .font('Helvetica-Bold')
         .text(certificate.recipient_name, 60, 222, {
           width: pageW - 120,
           align: 'center'
         });

      // Program name — positioned at the {{PROGRAM_NAME}} placeholder
      // Template: ~62% from top, centered
      doc.fillColor(darkColor)
         .fontSize(26)
         .font('Helvetica-Bold')
         .text(certificate.program_name, 60, 360, {
           width: pageW - 120,
           align: 'center'
         });

      // Completion date — positioned at {{COMPLETION_DATE}} placeholder
      const completionDateFormatted = new Date(certificate.completion_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      doc.fillColor(grayColor)
         .fontSize(12)
         .font('Helvetica')
         .text(`Conducted on ${completionDateFormatted}`, 60, 410, {
           width: pageW - 120,
           align: 'center'
         });

      // --- STEP 3: Signature overlays ---
      // President Signature (left side) — matches [President Signature] placeholder
      const presSigX = 105;
      const sigAreaY = 445;

      if (presSigBuffer) {
        doc.image(presSigBuffer, presSigX + 15, sigAreaY - 5, { width: 120, height: 45, fit: [120, 45] });
      }
      // President name — below signature line
      doc.fillColor(darkColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(settings.president_name || 'Ahmed Yasin', presSigX - 10, sigAreaY + 52, { width: 170, align: 'center' });
      doc.fillColor(grayColor)
         .fontSize(9)
         .font('Helvetica')
         .text(settings.president_title || 'President', presSigX - 10, sigAreaY + 66, { width: 170, align: 'center' });

      // Vice President Signature (center) — matches [Vice President Signature] placeholder
      const vpSigX = 370;

      if (vpSigBuffer) {
        doc.image(vpSigBuffer, vpSigX + 15, sigAreaY - 5, { width: 120, height: 45, fit: [120, 45] });
      }
      // VP name — below signature line
      doc.fillColor(darkColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(settings.vice_president_name || 'Qudsia Mazhar', vpSigX - 10, sigAreaY + 52, { width: 170, align: 'center' });
      doc.fillColor(grayColor)
         .fontSize(9)
         .font('Helvetica')
         .text(settings.vice_president_title || 'Vice President', vpSigX - 10, sigAreaY + 66, { width: 170, align: 'center' });

      // --- STEP 4: QR Code overlay (right side) ---
      // Positioned at the {{QR_CODE}} placeholder area
      const qrX = 680;
      const qrY = sigAreaY - 10;

      if (qrBuffer) {
        doc.image(qrBuffer, qrX, qrY, { width: 70, height: 70 });
      }

      // Small verification text below QR
      doc.fillColor(grayColor)
         .fontSize(6)
         .font('Helvetica')
         .text('Scan to Verify', qrX - 5, qrY + 73, { width: 80, align: 'center' });

      // Certificate ID at the very bottom (subtle)
      doc.fillColor('#94A3B8')
         .fontSize(6.5)
         .font('Helvetica')
         .text(`ID: ${certificate.id}  |  ${verifyUrl}`, 60, pageH - 30, {
           width: pageW - 120,
           align: 'center'
         });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseActive = !!(supabaseUrl && supabaseKey);

  // Default site settings profiles for signature blocks
  let settings = {
    president_name: 'Ahmad Yasin',
    president_title: 'President, Intellect Circle',
    president_signature_url: '',
    vice_president_name: 'Zainab Shah',
    vice_president_title: 'Vice President, Intellect Circle',
    vice_president_signature_url: ''
  };

  if (isSupabaseActive) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data: dbSettings } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (dbSettings) {
        settings = { ...settings, ...dbSettings };
      }
    } catch (e) {
      console.warn('[Certificates Handler] Failed to fetch settings from Supabase:', e.message);
    }
  }

  // 1. PUBLIC ENDPOINTS (No Auth Required)
  // Verification lookup check: GET /api/certificates?id=CERTIFICATE_ID
  if (req.method === 'GET' && req.query.id && req.query.action !== 'download-pdf') {
    const { id } = req.query;

    if (!isSupabaseActive) {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      try {
        const defaultData = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.json'), 'utf-8'));
        const mockCert = (defaultData.certificates || []).find(c => c.id === id);
        if (mockCert) return res.status(200).json(mockCert);
        return res.status(404).json({ error: 'Certificate not found' });
      } catch (e) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data, error } = await supabase.from('certificates').select('*').eq('id', id).single();
      if (error || !data) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Server-side PDF generation & download: GET /api/certificates?action=download-pdf&id=CERTIFICATE_ID
  if (req.method === 'GET' && req.query.action === 'download-pdf') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing certificate ID' });
    }

    let certificate;
    if (!isSupabaseActive) {
      // Offline fallback
      certificate = {
        id,
        recipient_name: 'Alex Johnson',
        recipient_email: 'alex@example.com',
        program_name: 'Foundations of Peer Learning',
        completion_date: '2026-07-08',
        status: 'valid',
        payment_status: 'free'
      };
    } else {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
        const { data, error } = await supabase.from('certificates').select('*').eq('id', id).single();
        if (error || !data) {
          return res.status(404).json({ error: 'Certificate not found' });
        }
        certificate = data;
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    try {
      const verifyUrl = `https://intellectcircle.dpdns.org/verify/${id}`;
      const pdfBuffer = await generateCertificatePdf(certificate, settings, verifyUrl, req);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate_${id}.pdf"`);
      return res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error('[PDF Generator] Error sending PDF stream:', err.message);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to generate PDF' });
      }
    }
  }

  // 2. PROTECTED ADMIN ENDPOINTS (Require Authentication)
  let adminUser;
  try {
    adminUser = await getAuthenticatedUser(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Unauthorized admin user session required.' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // GET /api/certificates (List all for admin panel)
  if (req.method === 'GET') {
    if (!isSupabaseActive) {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      try {
        const defaultData = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.json'), 'utf-8'));
        return res.status(200).json(defaultData.certificates || []);
      } catch (e) {
        return res.status(200).json([]);
      }
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/certificates (Generate new certificate & email it)
  if (req.method === 'POST') {
    const { recipient_name, recipient_email, program_name, completion_date, is_paid, price, payment_status, action } = req.body || {};

    // Check if the action is to resend an email for an existing certificate
    if (action === 'resend-email') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing certificate ID for email resend.' });
      }

      let certRecord;
      if (!isSupabaseActive) {
        certRecord = {
          id,
          recipient_name: recipient_name || 'Attendee',
          recipient_email: recipient_email || 'recipient@example.com',
          program_name: program_name || 'Session Title',
          completion_date: completion_date || '2026-07-08',
          status: 'valid',
          payment_status: 'free'
        };
      } else {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
        const { data, error } = await supabase.from('certificates').select('*').eq('id', id).single();
        if (error || !data) {
          return res.status(404).json({ error: 'Certificate not found for email resend.' });
        }
        certRecord = data;
      }

      try {
        const verifyUrl = `https://intellectcircle.dpdns.org/verify/${certRecord.id}`;
        const pdfBuffer = await generateCertificatePdf(certRecord, settings, verifyUrl, req);
        const emailRes = await sendCertificateEmail({
          recipient_name: certRecord.recipient_name,
          recipient_email: certRecord.recipient_email,
          program_name: certRecord.program_name,
          verifyUrl,
          pdfBuffer,
          certificateId: certRecord.id
        });

        if (emailRes.success) {
          await logActivity(adminUser.email, 'Resend Certificate Email', `Resent certificate ${certRecord.id} email to ${certRecord.recipient_email}`);
          return res.status(200).json({ success: true, message: `Email successfully resent. (${emailRes.method})` });
        } else {
          return res.status(500).json({ error: `Failed to send email: ${emailRes.error}` });
        }
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // Standard certificate generation
    if (!recipient_name || !recipient_email || !program_name || !completion_date) {
      return res.status(400).json({ error: 'Missing required certificate fields.' });
    }

    const year = new Date(completion_date).getFullYear() || new Date().getFullYear();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const certId = `IC-${year}-${uniqueSuffix}`;

    let newCert = {
      id: certId,
      recipient_name,
      recipient_email,
      program_name,
      completion_date,
      status: 'valid',
      is_paid: !!is_paid,
      price: price || 0.00,
      payment_status: payment_status || 'free',
      created_at: new Date().toISOString()
    };

    if (isSupabaseActive) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
        const { data, error } = await supabase
          .from('certificates')
          .insert({
            id: certId,
            recipient_name,
            recipient_email,
            program_name,
            completion_date,
            status: 'valid',
            is_paid: !!is_paid,
            price: price || 0.00,
            payment_status: payment_status || 'free'
          })
          .select()
          .single();

        if (error) throw error;
        newCert = data;
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      // Mock saving in dev src/data.json
      const { readFileSync, writeFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      try {
        const dataPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.json');
        const defaultData = JSON.parse(readFileSync(dataPath, 'utf-8'));
        if (!defaultData.certificates) defaultData.certificates = [];
        defaultData.certificates.unshift(newCert);
        writeFileSync(dataPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      } catch (e) {
        console.error('Failed to update local mock DB:', e.message);
      }
    }

    // Attempt to email immediately upon creation
    try {
      const verifyUrl = `https://intellectcircle.dpdns.org/verify/${newCert.id}`;
      const pdfBuffer = await generateCertificatePdf(newCert, settings, verifyUrl, req);
      const emailRes = await sendCertificateEmail({
        recipient_name: newCert.recipient_name,
        recipient_email: newCert.recipient_email,
        program_name: newCert.program_name,
        verifyUrl,
        pdfBuffer,
        certificateId: newCert.id
      });

      let responseMsg = 'Certificate generated successfully.';
      if (emailRes.success) {
        responseMsg += ` Email sent via ${emailRes.method}.`;
        if (emailRes.method === 'simulation') {
          // Log email to mock logs for easy admin visibility
          await logActivity('system', 'Email Simulation Log', `Simulated email to ${newCert.recipient_email} for certificate ${newCert.id}. Verification Link: ${verifyUrl}`);
        }
      } else {
        responseMsg += ` However, email delivery failed: ${emailRes.error}`;
      }

      await logActivity(adminUser.email, 'Generate Certificate', `Issued certificate ${newCert.id} to ${newCert.recipient_name} (${newCert.recipient_email})`);

      return res.status(200).json({ success: true, data: newCert, message: responseMsg });
    } catch (err) {
      return res.status(200).json({ success: true, data: newCert, message: `Certificate generated, but PDF/Email creation failed: ${err.message}` });
    }
  }

  // PATCH /api/certificates (Revoke or Validate/Reinstate)
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    if (!id || !status || !['valid', 'revoked'].includes(status)) {
      return res.status(400).json({ error: 'Missing required update parameters (id, status).' });
    }

    if (!isSupabaseActive) {
      const { readFileSync, writeFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      try {
        const dataPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.json');
        const defaultData = JSON.parse(readFileSync(dataPath, 'utf-8'));
        if (defaultData.certificates) {
          defaultData.certificates = defaultData.certificates.map(c => c.id === id ? { ...c, status } : c);
        }
        writeFileSync(dataPath, JSON.stringify(defaultData, null, 2), 'utf-8');
        return res.status(200).json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data, error } = await supabase
        .from('certificates')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await logActivity(adminUser.email, status === 'revoked' ? 'Revoke Certificate' : 'Reinstate Certificate', `Updated certificate ${id} status to ${status}`);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
