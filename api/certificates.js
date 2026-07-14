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

// Merge site_settings / local admin data into a single settings object for PDF generation
function normalizeCertificateSettings(raw = {}) {
  const admin = raw.admin || {};
  return {
    ...raw,
    president_signature_url:
      raw.president_signature_url ||
      admin.presidentSignatureUrl ||
      admin.president_signature_url ||
      '',
    vice_president_signature_url:
      raw.vice_president_signature_url ||
      admin.vicePresidentSignatureUrl ||
      admin.vice_president_signature_url ||
      '',
    cert_name_x: raw.cert_name_x ?? admin.cert_name_x,
    cert_name_y: raw.cert_name_y ?? admin.cert_name_y,
    cert_name_size: raw.cert_name_size ?? admin.cert_name_size,
    cert_program_x: raw.cert_program_x ?? admin.cert_program_x,
    cert_program_y: raw.cert_program_y ?? admin.cert_program_y,
    cert_program_size: raw.cert_program_size ?? admin.cert_program_size,
    cert_date_x: raw.cert_date_x ?? admin.cert_date_x,
    cert_date_y: raw.cert_date_y ?? admin.cert_date_y,
    cert_date_size: raw.cert_date_size ?? admin.cert_date_size,
    cert_pres_x: raw.cert_pres_x ?? admin.cert_pres_x,
    cert_pres_y: raw.cert_pres_y ?? admin.cert_pres_y,
    cert_pres_w: raw.cert_pres_w ?? admin.cert_pres_w,
    cert_pres_h: raw.cert_pres_h ?? admin.cert_pres_h,
    cert_vp_x: raw.cert_vp_x ?? admin.cert_vp_x,
    cert_vp_y: raw.cert_vp_y ?? admin.cert_vp_y,
    cert_vp_w: raw.cert_vp_w ?? admin.cert_vp_w,
    cert_vp_h: raw.cert_vp_h ?? admin.cert_vp_h,
    cert_qr_x: raw.cert_qr_x ?? admin.cert_qr_x,
    cert_qr_y: raw.cert_qr_y ?? admin.cert_qr_y,
    cert_qr_size: raw.cert_qr_size ?? admin.cert_qr_size,
    cert_id_x: raw.cert_id_x ?? admin.cert_id_x,
    cert_id_y: raw.cert_id_y ?? admin.cert_id_y,
    cert_id_size: raw.cert_id_size ?? admin.cert_id_size,
  };
}

async function loadCertificateSettings(isSupabaseActive, supabaseUrl, supabaseKey) {
  if (isSupabaseActive) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (data) return normalizeCertificateSettings(data);
    } catch (err) {
      console.warn('[Certificates] Failed to load site_settings from Supabase:', err.message);
    }
    return {};
  }

  try {
    const { readFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const defaultData = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.json'), 'utf-8'));
    return normalizeCertificateSettings({
      ...(defaultData.siteSettings || {}),
      admin: defaultData.admin || {},
    });
  } catch (e) {
    return {};
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
// All coordinates are read from settings (pixel space 3509x2480) and scaled to A4 landscape (842x595 pt)
async function generateCertificatePdf(certificate, settings, verifyUrl, req) {
  const host = req.headers.host || 'localhost';
  const protocol = req.headers.referer?.split('://')[0] || 'https';
  const baseUrl = `${protocol}://${host}`;

  // Template dimensions (pixel space)
  const TPL_W = 3509;
  const TPL_H = 2480;

  // A4 Landscape (point space)
  const pageW = 842;
  const pageH = 595;

  // Scale factors
  const sx = pageW / TPL_W;
  const sy = pageH / TPL_H;

  // Layout coordinates from settings (with defaults tuned to CERTIFICATE OF COMPLETION.jpg)
  const L = {
    nameX:    Number(settings.cert_name_x)    || 1755,
    nameY:    Number(settings.cert_name_y)    || 900,
    nameSize: Number(settings.cert_name_size) || 38,
    progX:    Number(settings.cert_program_x)    || 1755,
    progY:    Number(settings.cert_program_y)    || 1250,
    progSize: Number(settings.cert_program_size) || 22,
    dateX:    Number(settings.cert_date_x)    || 1755,
    dateY:    Number(settings.cert_date_y)    || 1580,
    dateSize: Number(settings.cert_date_size) || 14,
    presX:   Number(settings.cert_pres_x)  || 640,
    presY:   Number(settings.cert_pres_y)  || 1980,
    presW:   Number(settings.cert_pres_w)  || 280,
    presH:   Number(settings.cert_pres_h)  || 80,
    vpX:     Number(settings.cert_vp_x)    || 2870,
    vpY:     Number(settings.cert_vp_y)    || 1980,
    vpW:     Number(settings.cert_vp_w)    || 280,
    vpH:     Number(settings.cert_vp_h)    || 80,
    qrX:     Number(settings.cert_qr_x)    || 3120,
    qrY:     Number(settings.cert_qr_y)    || 2150,
    qrSize:  Number(settings.cert_qr_size) || 180,
    idX:     Number(settings.cert_id_x)    || 3120,
    idY:     Number(settings.cert_id_y)    || 2280,
    idSize:  Number(settings.cert_id_size) || 10,
  };

  const templateUrl = `${baseUrl}/CERTIFICATE%20OF%20COMPLETION.jpg`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;

  // Try loading template from local filesystem first
  let templateBuffer = null;
  try {
    const fs = await import('fs');
    const path = await import('path');
    const localPath = path.join(process.cwd(), 'public', 'CERTIFICATE OF COMPLETION.jpg');
    if (fs.existsSync(localPath)) {
      templateBuffer = fs.readFileSync(localPath);
    }
  } catch (err) {
    console.warn('[PDF Generator] Failed to read template from filesystem:', err.message);
  }

  // Fetch images in parallel
  const fetchPromises = [];
  fetchPromises.push(templateBuffer ? Promise.resolve(templateBuffer) : fetchImageBuffer(templateUrl));
  fetchPromises.push(fetchImageBuffer(qrUrl));

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

  const [finalTemplateBuffer, qrBuffer, presSigBuffer, vpSigBuffer] = await Promise.all(fetchPromises);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // STEP 1: Full-page background
      if (finalTemplateBuffer) {
        doc.image(finalTemplateBuffer, 0, 0, { width: pageW, height: pageH });
      } else {
        doc.rect(0, 0, pageW, pageH).fill('#FFFFFF');
      }

      const goldColor = '#B8972F';
      const darkColor = '#2D3748';
      const grayColor = '#4A5568';

      // STEP 2: Recipient Name (centered on template)
      doc.fillColor(goldColor)
         .fontSize(L.nameSize)
         .font('Helvetica-Bold')
         .text(certificate.recipient_name, 0, L.nameY * sy, {
           width: pageW,
           align: 'center'
         });

      // STEP 3: Program Name (centered on template)
      doc.fillColor(darkColor)
         .fontSize(L.progSize)
         .font('Helvetica-Bold')
         .text(certificate.program_name, 0, L.progY * sy, {
           width: pageW,
           align: 'center'
         });

      // STEP 4: Completion Date (centered at date position)
      const completionDateFormatted = new Date(certificate.completion_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      doc.fillColor(grayColor)
         .fontSize(L.dateSize)
         .font('Helvetica')
         .text(completionDateFormatted, 0, L.dateY * sy, {
           width: pageW,
           align: 'center'
         });

      // STEP 5: Signature image overlays (no text — template has names/titles)
      const presPtX = L.presX * sx;
      const presPtY = L.presY * sy;
      const presPtW = L.presW * sx;
      const presPtH = L.presH * sy;
      if (presSigBuffer) {
        doc.image(presSigBuffer, presPtX - presPtW / 2, presPtY - presPtH / 2, {
          width: presPtW, height: presPtH, fit: [presPtW, presPtH]
        });
      }

      const vpPtX = L.vpX * sx;
      const vpPtY = L.vpY * sy;
      const vpPtW = L.vpW * sx;
      const vpPtH = L.vpH * sy;
      if (vpSigBuffer) {
        doc.image(vpSigBuffer, vpPtX - vpPtW / 2, vpPtY - vpPtH / 2, {
          width: vpPtW, height: vpPtH, fit: [vpPtW, vpPtH]
        });
      }

      // STEP 6: QR Code
      const qrPtX = L.qrX * sx;
      const qrPtY = L.qrY * sy;
      const qrPtSize = L.qrSize * sx;
      if (qrBuffer) {
        doc.image(qrBuffer, qrPtX - qrPtSize / 2, qrPtY - qrPtSize / 2, {
          width: qrPtSize, height: qrPtSize
        });
      }

      // STEP 7: Certificate ID (below QR code)
      const idPtX = L.idX * sx;
      const idPtY = L.idY * sy;
      doc.fillColor(grayColor)
         .fontSize(L.idSize)
         .font('Helvetica')
         .text(`ID: ${certificate.id}`, idPtX - 80 * sx, idPtY, { width: 160 * sx, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================
// API Handler
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
  const isSupabaseActive = !!(supabaseUrl && supabaseKey);

  // Load settings (used for both public and admin endpoints)
  const settings = await loadCertificateSettings(isSupabaseActive, supabaseUrl, supabaseKey);

  // ================================================================
  // 1. PUBLIC ENDPOINTS (No Authentication Required)
  // ================================================================

  // Verification lookup: GET /api/certificates?id=CERTIFICATE_ID (not download-pdf)
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

  // Server-side PDF generation & download/preview:
  // GET /api/certificates?action=download-pdf&id=CERTIFICATE_ID
  // GET /api/certificates?action=download-pdf&id=CERTIFICATE_ID&inline=true  (for iframe preview)
  // GET /api/certificates?action=download-pdf&temp=true&recipient_name=...&program_name=...&completion_date=...
  if (req.method === 'GET' && req.query.action === 'download-pdf') {
    const { id, inline, temp, recipient_name, program_name, completion_date } = req.query;

    let certificate;
    if (temp === 'true') {
      // Temporary preview certificate (not saved in DB)
      certificate = {
        id: id || 'IC-PREVIEW',
        recipient_name: recipient_name || 'Sample Recipient',
        recipient_email: 'preview@example.com',
        program_name: program_name || 'Sample Program',
        completion_date: completion_date || new Date().toISOString().split('T')[0],
        status: 'valid'
      };
    } else if (!id) {
      return res.status(400).json({ error: 'Missing certificate ID' });
    } else if (!isSupabaseActive) {
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
      const host = req.headers.host || 'localhost';
      const protocol = req.headers.referer?.split('://')[0] || 'https';
      const baseUrl = `${protocol}://${host}`;
      const verifyUrl = `${baseUrl}/verify?id=${certificate.id}`;
      const pdfBuffer = await generateCertificatePdf(certificate, settings, verifyUrl, req);

      res.setHeader('Content-Type', 'application/pdf');
      if (inline === 'true') {
        res.setHeader('Content-Disposition', `inline; filename="certificate_${certificate.id}_preview.pdf"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificate.id}.pdf"`);
      }
      return res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error('[PDF Generator] Error:', err.message);
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
