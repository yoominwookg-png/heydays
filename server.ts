
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Initialize Firebase Admin
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
} else {
  console.warn('Firebase Admin credentials missing. Kakao login might not work.');
}

app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Kakao Login URL
app.get('/api/auth/kakao/url', (req, res) => {
  const clientId = process.env.VITE_KAKAO_CLIENT_ID;
  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const redirectUri = `${appUrl}/auth/kakao/callback`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'KAKAO_CLIENT_ID is not configured' });
  }

  const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  res.json({ url: authUrl });
});

// Kakao Callback
app.get('/auth/kakao/callback', async (req, res) => {
  const { code } = req.query;
  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const redirectUri = `${appUrl}/auth/kakao/callback`;
  
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // 1. Exchange code for token
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.VITE_KAKAO_CLIENT_ID,
        client_secret: process.env.KAKAO_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Get user info
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const kakaoUser = userResponse.data;
    const uid = `kakao:${kakaoUser.id}`;
    const email = kakaoUser.kakao_account?.email || `${kakaoUser.id}@kakao.com`;
    const displayName = kakaoUser.properties?.nickname || 'Kakao User';
    const photoURL = kakaoUser.properties?.profile_image;

    // 3. Create or update user and generate custom token
    let customToken;
    try {
      try {
        await admin.auth().getUser(uid);
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          await admin.auth().createUser({
            uid,
            email,
            displayName,
            photoURL,
          });
        } else {
          throw e;
        }
      }

      customToken = await admin.auth().createCustomToken(uid);
    } catch (e: any) {
      console.error('Firebase Admin Error:', e);
      return res.status(500).send(`Firebase Admin Error: ${e.message}. Please check if Firebase Admin is configured correctly in Secrets.`);
    }

    // 4. Return success page with postMessage
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f7f7f7; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                token: '${customToken}',
                provider: 'kakao'
              }, '*');
              window.close();
            } else {
              window.location.href = '/?token=${customToken}';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Kakao Auth Error:', error.response?.data || error.message);
    res.status(500).send(`Authentication failed: ${JSON.stringify(error.response?.data || error.message)}`);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
