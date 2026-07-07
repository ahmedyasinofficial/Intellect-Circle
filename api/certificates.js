import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from './_auth-middleware.js';
import PDFDocument from 'pdfkit';

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

  // 1. PUBLIC ENDPOINTS (No Auth Needed)
  // Verification check: GET /api/certificates?id=CERTIFICATE_ID
  if (req.method === 'GET' && req.query.id && req.query.action !== 'download-pdf') {
    const { id } = req.query;

    if (!isSupabaseActive) {
      // Dev mock response
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      try {
        const defaultData = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.json'), 'utf-8'));
        const mockCert = (defaultData.certificates || []).find(c => c.id === id);
        if (mockCert) return res.status(200).json(mockCert);
        return res.status(404).json({ error: 'Certificate not found in mock database' });
      } catch (e) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Server-side PDF Generation: GET /api/certificates?action=download-pdf&id=CERTIFICATE_ID
  if (req.method === 'GET' && req.query.action === 'download-pdf') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing certificate ID' });
    }

    let certificate;
    let signatureUrl = null;

    if (!isSupabaseActive) {
      // Mock data for PDF gen in dev
      certificate = {
        id,
        recipient_name: 'Alex Johnson',
        recipient_email: 'alex@example.com',
        program_name: 'Foundations of Peer Learning',
        completion_date: '2026-07-07',
        status: 'valid'
      };
    } else {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
        const { data, error } = await supabase.from('certificates').select('*').eq('id', id).single();
        if (error || !data) {
          return res.status(404).json({ error: 'Certificate not found' });
        }
        certificate = data;

        // Fetch signature from settings
        const { data: settings } = await supabase.from('site_settings').select('authorized_signature_url').eq('id', 1).single();
        if (settings) {
          signatureUrl = settings.authorized_signature_url;
        }
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    try {
      // Create PDF Document (A4 landscape)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate_${id}.pdf"`);
      doc.pipe(res);

      // --- Background & Borders ---
      // Outer border
      doc.rect(20, 20, 792 - 40, 612 - 40)
         .lineWidth(2)
         .stroke('#C9A84C');
      
      // Inner thin border
      doc.rect(25, 25, 792 - 50, 612 - 50)
         .lineWidth(0.5)
         .stroke('#C9A84C');

      // --- Certificate Header ---
      doc.moveDown(3);
      doc.fillColor('#0F172A') // Primary Dark
         .fontSize(38)
         .font('Times-Roman')
         .text('INTELLECT CIRCLE', { align: 'center', characterSpacing: 2 });

      doc.moveDown(0.5);
      doc.fillColor('#C9A84C') // Gold Accent
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('CERTIFICATE OF COMPLETION', { align: 'center', characterSpacing: 1 });

      // --- Certificate Body ---
      doc.moveDown(1.5);
      doc.fillColor('#475569') // Text Muted
         .fontSize(14)
         .font('Times-Italic')
         .text('This is proudly presented to', { align: 'center' });

      doc.moveDown(0.8);
      doc.fillColor('#0F172A') // Primary Dark
         .fontSize(28)
         .font('Times-Bold')
         .text(certificate.recipient_name, { align: 'center' });

      doc.moveDown(0.8);
      doc.fillColor('#475569')
         .fontSize(14)
         .font('Times-Italic')
         .text('in recognition of active participation and successful completion of', { align: 'center' });

      doc.moveDown(0.8);
      doc.fillColor('#C9A84C')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(certificate.program_name, { align: 'center' });

      doc.moveDown(1.2);
      const completionDateFormatted = new Date(certificate.completion_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      doc.fillColor('#475569')
         .fontSize(12)
         .font('Helvetica')
         .text(`Awarded on ${completionDateFormatted}`, { align: 'center' });

      // --- Footer Section (Signature & QR Code) ---
      const footerY = 430;

      // 1. Authorized Signature (Left)
      const sigX = 80;
      doc.moveTo(sigX, footerY)
         .lineTo(sigX + 180, footerY)
         .lineWidth(0.5)
         .stroke('#94A3B8');
      
      doc.fillColor('#475569')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('AUTHORIZED SIGNATURE', sigX, footerY + 10, { width: 180, align: 'center' });

      if (signatureUrl) {
        // Resolve signature URL (if absolute, fetch; if relative, prepend host)
        const host = req.headers.host || 'localhost';
        const protocol = req.headers.referer?.split('://')[0] || 'https';
        const absoluteSigUrl = signatureUrl.startsWith('http') 
          ? signatureUrl 
          : `${protocol}://${host}${signatureUrl}`;
        
        const sigBuffer = await fetchImageBuffer(absoluteSigUrl);
        if (sigBuffer) {
          doc.image(sigBuffer, sigX + 30, footerY - 55, { width: 120, height: 50 });
        }
      }

      // 2. Verification QR Code (Right)
      const qrX = 540;
      const verifyUrl = `https://intellectcircle.dpdns.org/verify/${id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;
      const qrBuffer = await fetchImageBuffer(qrUrl);
      
      if (qrBuffer) {
        doc.image(qrBuffer, qrX, footerY - 70, { width: 70, height: 70 });
        doc.fillColor('#94A3B8')
           .fontSize(8)
           .font('Helvetica')
           .text('Scan to Verify Authenticity', qrX - 25, footerY + 10, { width: 120, align: 'center' });
      }

      // 3. Unique ID
      doc.fillColor('#94A3B8')
         .fontSize(8)
         .font('Helvetica')
         .text(`Certificate ID: ${id}`, 50, 530, { align: 'left' });

      doc.fillColor('#94A3B8')
         .fontSize(8)
         .font('Helvetica')
         .text(`Status: ${certificate.status.toUpperCase()}`, 50, 542, { align: 'left' });

      doc.end();
      return;
    } catch (err) {
      console.error('[PDF Generator] Error generating document:', err.message);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to generate PDF server-side.' });
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

  // GET /api/certificates (List all)
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

  // POST /api/certificates (Generate new)
  if (req.method === 'POST') {
    const { recipient_name, recipient_email, program_name, completion_date } = req.body || {};
    if (!recipient_name || !recipient_email || !program_name || !completion_date) {
      return res.status(400).json({ error: 'Missing required certificate fields.' });
    }

    // Generate unique Certificate ID
    const year = new Date(completion_date).getFullYear() || new Date().getFullYear();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const certId = `IC-${year}-${uniqueSuffix}`;

    if (!isSupabaseActive) {
      // Mock saving in dev
      const { readFileSync, writeFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      try {
        const dataPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.json');
        const defaultData = JSON.parse(readFileSync(dataPath, 'utf-8'));
        if (!defaultData.certificates) defaultData.certificates = [];
        
        const newCert = {
          id: certId,
          recipient_name,
          recipient_email,
          program_name,
          completion_date,
          status: 'valid',
          created_at: new Date().toISOString()
        };
        defaultData.certificates.unshift(newCert);
        writeFileSync(dataPath, JSON.stringify(defaultData, null, 2), 'utf-8');
        return res.status(200).json({ success: true, data: newCert });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

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
          status: 'valid'
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH /api/certificates (Revoke or validate)
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    if (!id || !status || !['valid', 'revoked'].includes(status)) {
      return res.status(400).json({ error: 'Missing required update parameters (id, status).' });
    }

    if (!isSupabaseActive) {
      // Mock updating in dev
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
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
