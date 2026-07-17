// /api/gemini.js  —  Serverless function: Gemini AI for blog articles
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { articleTitle, articleContent, question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Missing question' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured. Set GEMINI_API_KEY in your environment variables.' });
  }

  const systemPrompt = [
    'You are a helpful AI assistant for Intellect Circle, an intellectual community.',
    articleTitle ? `You are answering questions about the article titled: "${articleTitle}".` : '',
    articleContent ? `Here is the article content:\n\n${articleContent.slice(0, 8000)}` : '',
    '\nAnswer the user\'s question concisely and helpfully, referencing the article where relevant.',
    'If the question is outside the article scope, still provide a helpful general answer.',
    'Keep responses under 250 words unless the user explicitly asks for more detail.'
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\nUser question: ' + question }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
          ]
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Gemini API error:', err);
      return res.status(502).json({ error: err?.error?.message || 'Gemini API error' });
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer generated.';
    return res.status(200).json({ answer });
  } catch (err) {
    console.error('Gemini fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
