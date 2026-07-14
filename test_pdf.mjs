import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const localPath = path.join(process.cwd(), 'public', 'CERTIFICATE OF COMPLETION.jpg');
console.log('Template exists:', fs.existsSync(localPath));

const templateBuffer = fs.readFileSync(localPath);
console.log('Template buffer length:', templateBuffer.length);
console.log('First bytes:', templateBuffer.slice(0, 4).toString('hex'));

const pageW = 842;
const pageH = 595;

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margins: { top: 0, bottom: 0, left: 0, right: 0 }
});

const chunks = [];
doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
  const pdfBuffer = Buffer.concat(chunks);
  console.log('PDF buffer length:', pdfBuffer.length);
  const outPath = path.join(process.cwd(), 'test_output.pdf');
  fs.writeFileSync(outPath, pdfBuffer);
  console.log('Written to', outPath);
  
  // Check if it contains image data
  const pdfStr = pdfBuffer.toString('latin1');
  console.log('PDF contains /Image:', pdfStr.includes('/Image'));
  console.log('PDF contains /DCTDecode (JPEG):', pdfStr.includes('/DCTDecode'));
});

doc.on('error', err => {
  console.error('PDF error:', err);
});

// Try embedding the image
try {
  doc.image(templateBuffer, 0, 0, { width: pageW, height: pageH });
  console.log('doc.image() call succeeded');
} catch (err) {
  console.error('doc.image() FAILED:', err.message);
}

// Add some test text
doc.fillColor('#B8972F')
   .fontSize(38)
   .font('Helvetica-Bold')
   .text('Test Name', 0, 200, { width: pageW, align: 'center' });

doc.end();
