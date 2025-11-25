# Deploying Backend API on Render

## Important Note

**Your current project uses Supabase as the backend** - you don't NEED a separate backend server. Supabase handles:
- Authentication
- Database (PostgreSQL)
- Storage (file uploads)
- Real-time subscriptions
- API endpoints (auto-generated)

However, if you want to add a **custom backend API** for additional functionality (webhooks, custom business logic, third-party integrations), you can deploy one on Render.

## Option 1: Keep Using Supabase (Recommended)

**No deployment needed!** Your Supabase backend is already live at:
- URL: `https://mdquwmiavgydtfcwpzzt.supabase.co`
- This is your backend - it's already deployed and working

**Deploy only the frontend:**
- Frontend → Netlify (static site)
- Backend → Supabase (already deployed)

## Option 2: Create Custom Backend API on Render

If you need custom API endpoints, webhooks, or server-side logic, follow these steps:

### Step 1: Create Backend API Server

Create a new folder `backend` in your project:

```bash
mkdir backend
cd backend
```

### Step 2: Initialize Node.js Project

```bash
npm init -y
npm install express cors dotenv @supabase/supabase-js
```

### Step 3: Create `server.js`

```javascript
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase (using service role key for admin operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is running' });
});

// Example: Custom endpoint to get all locations with media
app.get('/api/locations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*, location_media(*)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example: Custom webhook endpoint
app.post('/api/webhook', async (req, res) => {
  // Your custom webhook logic here
  console.log('Webhook received:', req.body);
  res.json({ received: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 4: Create `package.json` (update)

```json
{
  "name": "twinnir-backend",
  "version": "1.0.0",
  "description": "TWINNIR Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "@supabase/supabase-js": "^2.38.4"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Step 5: Create `.env.example`

```env
PORT=3000
SUPABASE_URL=https://mdquwmiavgydtfcwpzzt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 6: Get Supabase Service Role Key

1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy the **service_role** key (NOT the anon key - this is secret!)
3. Keep it secure - never commit it to Git

### Step 7: Deploy to Render

1. **Push backend to Git:**
   ```bash
   git init
   git add .
   git commit -m "Initial backend commit"
   git remote add origin <your-git-repo-url>
   git push -u origin main
   ```

2. **In Render Dashboard:**
   - Go to [render.com](https://render.com) and sign in
   - Click **"New"** → **"Web Service"**
   - Connect your Git repository
   - Select the repository with your backend code

3. **Configure the service:**
   - **Name:** `twinnir-backend` (or any name)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid if needed)

4. **Add Environment Variables:**
   - Click **"Environment"** tab
   - Add:
     - `SUPABASE_URL` = `https://mdquwmiavgydtfcwpzzt.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key from Supabase)
     - `PORT` = `3000` (optional, Render sets this automatically)

5. **Deploy:**
   - Click **"Create Web Service"**
   - Wait for deployment (2-3 minutes)
   - Copy your Render URL (e.g., `https://twinnir-backend.onrender.com`)

### Step 8: Update Frontend to Use Backend API (Optional)

If you want to use your custom backend instead of direct Supabase calls:

**Update `config.js`:**
```javascript
const SUPABASE_URL = 'https://mdquwmiavgydtfcwpzzt.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const BACKEND_API_URL = 'https://twinnir-backend.onrender.com'; // Your Render backend URL

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**Example: Use backend API instead of direct Supabase:**
```javascript
// Instead of:
const { data } = await supabase.from('locations').select('*');

// Use:
const response = await fetch(`${BACKEND_API_URL}/api/locations`);
const data = await response.json();
```

## Recommended Architecture

For your use case, I recommend:

```
┌─────────────────┐
│   Frontend      │  → Deploy on Netlify
│  (landing.html) │
└────────┬────────┘
         │
         ├──→ Supabase (Backend)
         │    - Authentication
         │    - Database
         │    - Storage
         │
         └──→ Custom Backend (Optional)
              - Only if you need:
                * Webhooks
                * Custom business logic
                * Third-party integrations
                * Scheduled jobs
```

## When Do You Need a Custom Backend?

You need a custom backend if you want:
- ✅ Webhooks from external services
- ✅ Scheduled tasks (cron jobs)
- ✅ Complex server-side processing
- ✅ Integration with services that require server-side API keys
- ✅ Custom authentication flows
- ✅ Server-side file processing

You DON'T need a custom backend for:
- ❌ Basic CRUD operations (Supabase handles this)
- ❌ Authentication (Supabase handles this)
- ❌ File uploads (Supabase Storage handles this)
- ❌ Database queries (Supabase handles this)

## Quick Decision Guide

**Use Supabase only (current setup):**
- ✅ Faster to deploy
- ✅ No server maintenance
- ✅ Automatic scaling
- ✅ Built-in security
- ✅ Free tier available

**Add Render backend:**
- ✅ More control
- ✅ Custom business logic
- ✅ Webhook support
- ❌ More complex
- ❌ Server maintenance
- ❌ Additional costs

## Summary

**For your current project:**
1. **Frontend** → Deploy on **Netlify** (static site)
2. **Backend** → Already on **Supabase** (no deployment needed)

**If you need custom API:**
1. Create Node.js backend
2. Deploy on **Render**
3. Update frontend to use both Supabase (direct) and Render API (custom endpoints)

Would you like me to help you create a custom backend, or are you good with just Supabase?

