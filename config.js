// Supabase Configuration
const SUPABASE_URL = 'https://mdquwmiavgydtfcwpzzt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcXV3bWlhdmd5ZHRmY3dwenp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDcxNTcsImV4cCI6MjA3OTU4MzE1N30.rHOK9X5oCkZhW3nYtuba9oFa6FYgjU8Lfsath9zOBpo';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

