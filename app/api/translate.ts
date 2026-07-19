// API endpoint for translation using free MyMemory API
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, sourceLanguage, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Missing required parameters: text, targetLanguage' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate the text to the target language. Respond ONLY with the translated text. Do not add any introduction, explanations, or quotes.'
            },
            {
              role: 'user',
              content: `Translate the following text to language code "${targetLanguage}" (source language is "${sourceLanguage || 'auto'}"):\n\n${text}`
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2
        })
      });

      const data = await response.json();
      const translatedText = data?.choices?.[0]?.message?.content?.trim();
      if (response.ok && translatedText) {
        return res.status(200).json({ translation: translatedText });
      }
      console.warn('Groq translation failed or returned empty, falling back to MyMemory', data);
    }

    // Fallback to MyMemory Translation API
    const sourceLang = sourceLanguage || 'en';
    const langPair = `${sourceLang}|${targetLanguage}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    const fallbackResponse = await fetch(url);
    const fallbackData = await fallbackResponse.json();

    if (fallbackData.responseStatus === 200 && fallbackData.responseData) {
      res.status(200).json({ translation: fallbackData.responseData.translatedText });
    } else {
      res.status(500).json({ error: 'Translation failed', details: fallbackData.responseDetails || 'Unknown error' });
    }
  } catch (error) {
    console.error('Translation API error:', error);
    res.status(500).json({ error: 'An error occurred during translation.' });
  }
};
