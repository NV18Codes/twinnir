# Setup Instructions for TWINNER Authentication & Database

This guide will walk you through setting up Supabase authentication and database for the TWINNER project.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Basic understanding of SQL

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in (or create an account)
2. Click "New Project"
3. Fill in the project details:
   - **Name**: TWINNER (or any name you prefer)
   - **Database Password**: Create a strong password (save this securely)
   - **Region**: Choose the region closest to your users
4. Click "Create new project"
5. Wait for the project to be set up (this may take a few minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** (gear icon in the left sidebar)
2. Click on **API** in the settings menu
3. You'll find:
   - **Project URL**: Copy this (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**: Copy this key (starts with `eyJ...`)

## Step 3: Configure Your Project

1. Open the `config.js` file in your project
2. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';  // Replace with your Project URL
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // Replace with your anon key
   ```
3. Save the file

## Step 4: Set Up Database Tables

1. In your Supabase dashboard, go to **SQL Editor** (in the left sidebar)
2. Click "New query"
3. Copy and paste the following SQL code:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL,
    organization TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('asset', 'space', 'asset_type', 'space_type', 'property')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    file_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', '360', '3dgs')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_locations_category ON locations(category);

-- Create index on coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);

-- Create annotations table
CREATE TABLE IF NOT EXISTS annotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    geo_json JSONB NOT NULL,
    color TEXT DEFAULT '#FF0000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create policies for locations table
-- Allow anyone to view locations (public access)
CREATE POLICY "Public can view all locations"
    ON locations FOR SELECT
    USING (true);

-- Only authenticated users can insert locations
CREATE POLICY "Authenticated users can insert locations"
    ON locations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can only update their own locations
CREATE POLICY "Users can update their own locations"
    ON locations FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own locations
CREATE POLICY "Users can delete their own locations"
    ON locations FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for annotations table
CREATE POLICY "Users can view all annotations"
    ON annotations FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own annotations"
    ON annotations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations"
    ON annotations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations"
    ON annotations FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create space_types table
CREATE TABLE IF NOT EXISTS space_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_types table
CREATE TABLE IF NOT EXISTS asset_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    space_type_id UUID REFERENCES space_types(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
    asset_type_id UUID REFERENCES asset_types(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create location_media table to group media by location
CREATE TABLE IF NOT EXISTS location_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video', '360', '3dgs')),
    thumbnail_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update locations table to link to entities
ALTER TABLE locations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS asset_type_id UUID REFERENCES asset_types(id) ON DELETE SET NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS space_type_id UUID REFERENCES space_types(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_organization ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_spaces_property ON spaces(property_id);
CREATE INDEX IF NOT EXISTS idx_spaces_space_type ON spaces(space_type_id);
CREATE INDEX IF NOT EXISTS idx_assets_space ON assets(space_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_assets_property ON assets(property_id);
CREATE INDEX IF NOT EXISTS idx_location_media_location ON location_media(location_id);
CREATE INDEX IF NOT EXISTS idx_locations_organization ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_property ON locations(property_id);
CREATE INDEX IF NOT EXISTS idx_locations_space ON locations(space_id);
CREATE INDEX IF NOT EXISTS idx_locations_asset ON locations(asset_id);

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations (public read, authenticated write)
CREATE POLICY "Public can view organizations"
    ON organizations FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update organizations"
    ON organizations FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete organizations"
    ON organizations FOR DELETE
    USING (auth.role() = 'authenticated');

-- RLS Policies for properties
CREATE POLICY "Public can view properties"
    ON properties FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage properties"
    ON properties FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for space_types
CREATE POLICY "Public can view space_types"
    ON space_types FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage space_types"
    ON space_types FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for asset_types
CREATE POLICY "Public can view asset_types"
    ON asset_types FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage asset_types"
    ON asset_types FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for spaces
CREATE POLICY "Public can view spaces"
    ON spaces FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage spaces"
    ON spaces FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for assets
CREATE POLICY "Public can view assets"
    ON assets FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage assets"
    ON assets FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for location_media
CREATE POLICY "Public can view location_media"
    ON location_media FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert location_media"
    ON location_media FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete location_media"
    ON location_media FOR DELETE
    USING (auth.role() = 'authenticated');

-- Create triggers for updated_at on new tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_space_types_updated_at BEFORE UPDATE ON space_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_types_updated_at BEFORE UPDATE ON asset_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" to execute the SQL
5. You should see a success message

## Step 5: Set Up Storage Bucket (for file uploads)

1. In your Supabase dashboard, go to **Storage** (in the left sidebar)
2. Click "New bucket"
3. Create a bucket with:
   - **Name**: `location-files`
   - **Public bucket**: Toggle ON (so files can be accessed via URL)
4. Click "Create bucket"
5. Go to **Policies** tab for the bucket
6. Click "New policy" and select "For full customization"
7. Copy and paste this policy:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'location-files');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'location-files');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'location-files');

-- Allow public to view files
CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'location-files');
```

8. Click "Review" and then "Save policy"

## Step 6: Configure Authentication Settings

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, enter your site URL:
   - For local development: `http://localhost:8000`
   - For production: Your actual domain
3. Under **Redirect URLs**, add:
   - `http://localhost:8000/landing.html`
   - `http://localhost:8000/landing.html?reset=true`
   - (Add your production URLs as well)
4. Scroll down to **Email Auth**:
   - Make sure "Enable email confirmations" is ON (recommended for production)
   - For testing, you can turn it OFF temporarily
5. Click "Save"

## Step 7: Test Your Setup

1. Make sure your local server is running:
   ```bash
   python -m http.server 8000
   ```
2. Open your browser and go to `http://localhost:8000/landing.html`
3. Try signing up with a test email
4. Check your Supabase dashboard → **Authentication** → **Users** to see if the user was created
5. Try signing in with the credentials you just created

## Step 8: Verify Database Tables

1. In Supabase dashboard, go to **Table Editor**
2. You should see three tables:
   - `profiles`
   - `locations`
   - `annotations`
3. Check that the `profiles` table has a row for your test user

## Troubleshooting

### Issue: "Invalid API key" error
- **Solution**: Double-check that you copied the correct `anon` key (not the `service_role` key) in `config.js`

### Issue: "Email not confirmed" error
- **Solution**: 
  - Check your email for the confirmation link
  - Or temporarily disable email confirmation in Authentication settings for testing

### Issue: "Row Level Security policy violation"
- **Solution**: Make sure you ran all the SQL policies in Step 4

### Issue: File upload fails
- **Solution**: 
  - Verify the storage bucket `location-files` exists
  - Check that the storage policies are set up correctly
  - Make sure the bucket is set to public

### Issue: User profile not created
- **Solution**: The profile is created automatically when a user signs up. If it's not working, check the browser console for errors.

## Security Notes

1. **Never commit your Supabase keys to version control**
   - Consider using environment variables for production
   - The `anon` key is safe to use in client-side code (it's public by design)
   - Never expose the `service_role` key in client-side code

2. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Users can only modify their own data
   - Locations and annotations are viewable by all authenticated users

3. **Email Verification**
   - Enable email verification for production
   - Configure your email templates in Authentication → Email Templates

## Next Steps

- Customize the email templates in Supabase
- Set up custom domains (if needed)
- Configure backup schedules
- Set up monitoring and alerts

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the Supabase dashboard logs
3. Review the Supabase documentation: https://supabase.com/docs

---

**Important**: Keep your database password and service_role key secure. Never share them publicly.

