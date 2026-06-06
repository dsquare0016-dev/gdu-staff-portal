import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('--- Step 1: Sign in ---');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'superadmin@portal.gdu.gov.ng',
    password: 'GDUportal2026!'
  });
  
  if (authError) {
    console.error('Auth FAILED:', authError.message);
    return;
  }
  
  console.log('Auth SUCCESS! User ID:', authData.user.id);
  
  console.log('\n--- Step 2: Fetch profile by id ---');
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle();
    const elapsed = Date.now() - start;
    if (error) {
      console.error(`Query FAILED in ${elapsed}ms:`, error.message, 'Code:', error.code);
    } else {
      console.log(`Query SUCCESS in ${elapsed}ms:`, data);
    }
  } catch(e) {
    console.error('Exception:', e.message);
  }
  
  console.log('\n--- Step 3: Fetch profile by user_id ---');
  const start2 = Date.now();
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', authData.user.id).maybeSingle();
    const elapsed = Date.now() - start2;
    if (error) {
      console.error(`Query FAILED in ${elapsed}ms:`, error.message, 'Code:', error.code);
    } else {
      console.log(`Query SUCCESS in ${elapsed}ms:`, data);
    }
  } catch(e) {
    console.error('Exception:', e.message);
  }
  
  await supabase.auth.signOut();
  console.log('\nSigned out.');
}

test();
