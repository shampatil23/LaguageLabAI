<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/dd091cac-e4b3-446d-8566-9f84f8e59770

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill in the Firebase configuration values.
3. To enable translation features, you will need a Google Cloud project with the Cloud Translation API enabled. Set the `GOOGLE_PROJECT_ID` in your `.env` file. You will also need to set up authentication. The easiest way for local development is to install the Google Cloud CLI and run `gcloud auth application-default login`.
4. For a production deployment, you may add `VITE_FIREBASE_*` values from `.env.example` in your hosting provider's environment-variable settings to override the project's public default Firebase configuration.
5. Run the app:
   `npm run dev`
