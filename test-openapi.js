import fs from 'fs';
import path from 'path';

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

async function checkOpenApi() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  console.log('Fetching OpenAPI spec from:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    // Save full OpenAPI spec to inspect
    fs.writeFileSync('openapi-spec.json', JSON.stringify(data, null, 2));
    console.log('Saved openapi-spec.json successfully!');
    
    const staffRecordsDef = data.definitions?.staff_records;
    if (staffRecordsDef) {
      console.log('staff_records properties:', Object.keys(staffRecordsDef.properties));
    } else {
      console.log('staff_records definition not found in OpenAPI spec.');
    }
    
    const monthlyAllowanceDef = data.definitions?.monthly_allowance_requests;
    if (monthlyAllowanceDef) {
      console.log('monthly_allowance_requests properties:', Object.keys(monthlyAllowanceDef.properties));
    } else {
      console.log('monthly_allowance_requests definition not found in OpenAPI spec.');
    }
  } catch (error) {
    console.error('Error fetching OpenAPI:', error);
  }
}

checkOpenApi();
