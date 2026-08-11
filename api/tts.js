// /api/tts.js — ElevenLabs Text-to-Speech serverless endpoint
// Accepts: POST { text: string }
// Returns: audio/mpeg stream (MP3)

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Voice IDs — swap to any ElevenLabs voice you prefer
// Rachel: warm, clear, natural-sounding female voice
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

// eleven_turbo_v2_5 supports 32 languages automatically
const MODEL_ID = 'eleven_turbo_v2_5';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
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

  try {
    const elResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: clean,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.45,        // balanced — natural variation
            similarity_boost: 0.80, // high — stays close to voice character
            style: 0.30,            // mild expressiveness
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elResponse.ok) {
      const errText = await elResponse.text();
      console.error('ElevenLabs error:', elResponse.status, errText);
      return res.status(elResponse.status).json({
        error: `ElevenLabs returned ${elResponse.status}`,
      });
    }

    // Stream the MP3 bytes directly to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = elResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('TTS endpoint error:', err);
    res.status(500).json({ error: 'TTS request failed' });
  }
}
