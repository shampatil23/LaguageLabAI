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
    // MyMemory Translation API (Free - 10,000 words/day)
    const sourceLang = sourceLanguage || 'en';
    const langPair = `${sourceLang}|${targetLanguage}`;
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData) {
      res.status(200).json({ translation: data.responseData.translatedText });
    } else {
      res.status(500).json({ error: 'Translation failed', details: data.responseDetails || 'Unknown error' });
    }
  } catch (error) {
    console.error('Translation API error:', error);
    res.status(500).json({ error: 'An error occurred during translation.' });
  }
};
