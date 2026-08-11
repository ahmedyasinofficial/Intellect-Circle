// /api/tts.js — Cartesia Text-to-Speech serverless endpoint
// Accepts: POST { text: string }
// Returns: audio/mpeg stream (MP3)

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;

// Cartesia voice ID
const VOICE_ID = 'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4';

// Cartesia model — sonic-2 is their latest high-quality model
const MODEL_ID = 'sonic-2';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  // Strip markdown links and URLs so they aren't read aloud
  const clean = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [label](url) → label
    .replace(/https?:\/\/\S+/g, '')           // raw URLs → removed
    .replace(/\*\*/g, '')                      // bold markers
    .replace(/\*/g, '')                        // italic markers
    .trim();

  if (!clean) {
    return res.status(400).json({ error: 'No speakable text after cleaning' });
  }

  if (!CARTESIA_API_KEY) {
    console.error('[TTS] CARTESIA_API_KEY is not set');
    return res.status(500).json({ error: 'TTS service is not configured' });
  }

  try {
    const cartesiaResponse = await fetch(
      'https://api.cartesia.ai/tts/bytes',
      {
        method: 'POST',
        headers: {
          'Cartesia-Version': '2024-06-10',
          'X-API-Key': CARTESIA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: MODEL_ID,
          transcript: clean,
          voice: {
            mode: 'id',
            id: VOICE_ID,
          },
          output_format: {
            container: 'mp3',
            bit_rate: 128000,
            sample_rate: 44100,
          },
        }),
      }
    );

    if (!cartesiaResponse.ok) {
      const errText = await cartesiaResponse.text();
      console.error('[TTS] Cartesia error:', cartesiaResponse.status, errText);
      // Return 502 so the client falls back to browser TTS instead of crashing
      return res.status(502).json({
        error: `Cartesia returned ${cartesiaResponse.status}: ${errText.slice(0, 200)}`,
      });
    }

    // Stream the MP3 bytes directly to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = cartesiaResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('[TTS] Endpoint error:', err);
    res.status(500).json({ error: 'TTS request failed' });
  }
}
