const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function checkColumns() {
  const { data, error } = await supabase.from('staff_records').select('*').limit(1);
  if (error) {
    console.error('Error fetching staff_records:', error);
  } else {
    console.log('Columns in staff_records table:', data[0] ? Object.keys(data[0]) : 'Empty table');
    // Fetch columns from information_schema if table is empty
    const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'staff_records' });
    if (colErr) {
      // Fallback: try raw query or system check
      console.log('RPC get_table_columns not available. Trying direct query on columns info if possible...');
    } else {
      console.log('Columns from RPC:', cols);
    }
  }
}

checkColumns();
