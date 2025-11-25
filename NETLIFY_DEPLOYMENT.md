# Netlify Deployment Guide for TWINNIR

## Prerequisites
- ✅ Supabase project created
- ✅ Database tables created
- ✅ Storage bucket and policies set up
- ✅ config.js configured with Supabase credentials

## Step 1: Update Supabase Authentication Settings

Before deploying, you need to configure Supabase to allow your Netlify domain:

1. **Get your Netlify URL** (you'll get this after deployment, but you can use a placeholder first)
   - Netlify will give you a URL like: `https://your-app-name.netlify.app`
   - Or you can set a custom domain

2. **In Supabase Dashboard:**
   - Go to **Authentication** → **Settings**
   - Under **Site URL**, enter your Netlify URL:
     - `https://your-app-name.netlify.app` (or your custom domain)
   - Under **Redirect URLs**, add:
     - `https://your-app-name.netlify.app/landing.html`
     - `https://your-app-name.netlify.app/landing.html?reset=true`
     - `https://your-app-name.netlify.app/index.htm`
     - Keep localhost URLs for local development:
       - `http://localhost:8000/landing.html`
       - `http://localhost:8000/landing.html?reset=true`
   - Under **Email Auth**:
     - For testing: Turn OFF "Enable email confirmations" (users can sign in immediately)
     - For production: Turn ON "Enable email confirmations"
   - Click **Save**

## Step 2: Prepare Files for Netlify

Your project is already ready! Just make sure:
- ✅ All files are in the project folder
- ✅ `config.js` has the correct Supabase credentials
- ✅ No sensitive data in client-side code (you're using anon key, which is safe)

## Step 3: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended for first time)

1. **Go to [Netlify](https://www.netlify.com)** and sign in
2. **Click "Add new site" → "Deploy manually"**
3. **Drag and drop your entire project folder** into the deployment area
   - Make sure to include all files:
     - `landing.html`
     - `index.htm`
     - `config.js`
     - `app.js`
     - `auth.js`
     - `db-dashboard.js`
     - `landing.css`
     - All other files in your project
4. **Wait for deployment** (usually takes 1-2 minutes)
5. **Copy your site URL** (e.g., `https://random-name-12345.netlify.app`)
6. **Go back to Supabase** and update the Site URL and Redirect URLs with your actual Netlify URL

### Option B: Deploy via Git (Recommended for team collaboration)

1. **Push your code to GitHub/GitLab/Bitbucket**
2. **In Netlify:**
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider
   - Select your repository
   - Configure build settings:
     - **Build command:** (leave empty - this is a static site)
     - **Publish directory:** `/` (root directory)
   - Click "Deploy site"

## Step 4: Update Netlify Site Settings

1. **In Netlify Dashboard:**
   - Go to **Site settings** → **Domain management**
   - You can set a custom domain here if needed
   - Copy your final URL

2. **Update Supabase Authentication Settings again** with your final URL

## Step 5: Test Your Deployment

1. **Visit your Netlify URL** (e.g., `https://your-app.netlify.app/landing.html`)
2. **Test the following:**
   - ✅ Landing page loads
   - ✅ Sign up works
   - ✅ Sign in works
   - ✅ Dashboard button appears after login
   - ✅ Database dashboard opens
   - ✅ Can upload locations
   - ✅ Map displays correctly
   - ✅ Virtual tour (`index.htm`) works

## Important Notes for Team Testing

1. **Share the Netlify URL** with your team
2. **Create test accounts** for your team members
3. **Storage bucket** must be public for images to display
4. **All team members** need to sign up/sign in to use the app
5. **Database is shared** - all team members will see the same data

## Troubleshooting

### Issue: "Invalid redirect URL" error
- **Solution:** Make sure you added the exact Netlify URL to Supabase Redirect URLs

### Issue: Images not loading
- **Solution:** Check that storage bucket `location-files` is set to public

### Issue: Authentication not working
- **Solution:** Verify Site URL and Redirect URLs in Supabase match your Netlify URL exactly

### Issue: CORS errors
- **Solution:** Supabase should handle CORS automatically, but make sure your Netlify URL is in the allowed list

## Quick Checklist

Before sharing with team:
- [ ] Deployed to Netlify
- [ ] Updated Supabase Site URL with Netlify URL
- [ ] Added all Redirect URLs in Supabase
- [ ] Tested sign up/sign in
- [ ] Tested file upload
- [ ] Tested database dashboard
- [ ] Tested map functionality
- [ ] Shared Netlify URL with team

## Environment Variables (Optional)

If you want to use environment variables instead of hardcoding in `config.js`:

1. **In Netlify:**
   - Go to **Site settings** → **Environment variables**
   - Add:
     - `VITE_SUPABASE_URL` = your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

2. **Update config.js** to use:
   ```javascript
   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mdquwmiavgydtfcwpzzt.supabase.co';
   const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-key';
   ```

   Note: This requires using a build tool like Vite. For static deployment, keeping credentials in `config.js` is fine since the anon key is meant to be public.

