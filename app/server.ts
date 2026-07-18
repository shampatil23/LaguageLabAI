import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import express from "express";
import path from "path";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const apiKey = process.env.GROQ_API_KEY || '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';
      if (!apiKey) {
        return res.status(500).json({ error: "GROQ_API_KEY is not configured on server" });
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages,
          model: "llama-3.3-70b-versatile"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({
          error: "Groq API error",
          details: data.error?.message || JSON.stringify(data)
        });
      }

      res.json({ result: data.choices?.[0]?.message?.content || "" });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Failed to generate completion",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Firebase Auth REST API for creating users securely without signing out the current user
  app.post("/api/create-user", async (req, res) => {
    try {
      const { email, password } = req.body;
      const apiKey = process.env.VITE_FIREBASE_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Firebase API key not configured" });
      }

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, returnSecureToken: false }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(400).json({ error: data.error.message || "Failed to create user" });
      }

      res.json({ uid: data.localId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Cloudinary signatures for client-side upload if needed
  app.get("/api/upload-signature", (req, res) => {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request(
        { timestamp },
        process.env.CLOUDINARY_API_SECRET!
      );
      res.json({
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate signature" });
    }
  });

  // Free Translation API using MyMemory
  app.post("/api/translate", async (req, res) => {
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
