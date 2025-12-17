import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key] = value.replace(/"/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function getSchema() {
  // Since we can't query information_schema with anon key, let's try to describe tables via a query
  // But actually, Supabase client doesn't allow raw SQL for system tables.
  // Perhaps query a known table and infer.
  // To get schema, we can use the Supabase API for introspection, but it's limited.

  // Perhaps use fetch to call the REST API for a table description, but no.

  // Since anon key has limited access, perhaps the user needs to provide service role.

  // For now, let's try to select from a table to confirm connection.
  const { data, error } = await supabase.from('micro_cases').select('*').limit(1);
  if (error) {
    console.log('Error connecting:', error);
  } else {
    console.log('Connected successfully. Sample data:', data);
    console.log('To get full schema, need service role key for admin access.');
  }
}

getSchema();