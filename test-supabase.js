import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Querying for superadmin@portal.gdu.gov.ng...');
  const { data, error } = await supabase.from('profiles').select('*').eq('email', 'superadmin@portal.gdu.gov.ng');
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Result:', data);
  }

  console.log('\nQuerying all profiles:');
  const { data: allData, error: allErr } = await supabase.from('profiles').select('id, email, role, is_active');
  if (allErr) {
    console.error('Error:', allErr.message);
  } else {
    console.log('All Profiles:', allData);
  }
}

test();
