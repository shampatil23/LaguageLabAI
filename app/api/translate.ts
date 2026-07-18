// Placeholder for translate.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { TranslationServiceClient } from '@google-cloud/translate';

const translateClient = new TranslationServiceClient();

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, targetLanguage } = req.body;
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!text || !targetLanguage || !projectId) {
    return res.status(400).json({ error: 'Missing required parameters: text, targetLanguage, projectId' });
  }

  try {
    const request = {
      parent: `projects/${projectId}/locations/global`,
      contents: [text],
      mimeType: 'text/plain',
      targetLanguageCode: targetLanguage,
    };

    const [response] = await translateClient.translateText(request);

    if (response.translations && response.translations.length > 0) {
      res.status(200).json({ translation: response.translations[0].translatedText });
    } else {
      res.status(500).json({ error: 'Translation failed' });
    }
  } catch (error) {
    console.error('Translation API error:', error);
    res.status(500).json({ error: 'An error occurred during translation.' });
  }
};
