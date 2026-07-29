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
    'You are the Intellect Circle AI Assistant.',
    'Your job is to help readers understand the current article in a natural and conversational way.',
    articleTitle ? `The article title is: "${articleTitle}".` : '',
    articleContent ? `Here is the article content:\n\n${articleContent.slice(0, 8000)}` : '',

    'Follow these rules:',
    '- Answer the user\'s question directly.',
    '- Do not begin every response with "Welcome to Intellect Circle."',
    '- Avoid unnecessary introductions and repeated greetings.',
    '- Use simple and clear English.',
    '- Keep most answers between 50 and 150 words.',
    '- If a short answer is enough, use only one or two sentences.',
    '- Use bullet points only when they make the answer easier to understand.',
    '- Explain ideas in your own words instead of copying the article.',
    '- Use a simple example or analogy when helpful.',
    '- Base the answer mainly on the article.',
    '- Do not invent facts that are not supported by the article.',
    '- If the question goes beyond the article, clearly mention that you are giving general information.',
    '- Continue follow-up conversations naturally without repeating the article title or introduction.',
    '- Sound like a knowledgeable and friendly mentor, not a formal customer-service chatbot.'
  ].filter(Boolean).join('\n');

  const MODEL = 'gemini-3.1-flash-lite';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
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
      return res.status(response.status).json({
        error: err?.error?.message || 'Gemini API error',
        upstreamStatus: response.status,
        googleMessage: err?.error?.message || null,
        model: MODEL
      });
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer generated.';
    return res.status(200).json({ answer });
  } catch (err) {
    console.error('Gemini fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
