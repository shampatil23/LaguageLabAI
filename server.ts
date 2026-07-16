import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "llama3-8b-8192", // We can use the LLaMA3 model available on Groq
      });
      res.json({ result: chatCompletion.choices[0]?.message?.content || "" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate completion" });
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
