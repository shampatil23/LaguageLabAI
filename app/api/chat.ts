import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'app', '.env') });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Safe parsing of req.body
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const messages = body?.messages;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        const apiKey = process.env.GROQ_API_KEY || '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';

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages,
                model: 'llama-3.3-70b-versatile',
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Groq API Error Response:', data);
            return res.status(response.status).json({
                error: 'Groq API error response',
                details: data.error?.message || JSON.stringify(data)
            });
        }

        res.json({ result: data.choices?.[0]?.message?.content || '' });
    } catch (error) {
        console.error('Chat API Handler Error:', error);
        res.status(500).json({
            error: 'Failed to generate completion',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
