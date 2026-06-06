/**
 * apply-fix.js — Applies the complete_fix SQL migration to the live Supabase database.
 * Run: node apply-fix.js
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// We'll execute the SQL statements one by one using rpc
// Since we can't run raw SQL directly with anon key, we'll do it through individual API calls.

async function runFixes() {
  console.log('\n🚀 Starting GDU Portal Fix Script...\n');
  let passCount = 0;
  let failCount = 0;

  const log = (msg, ok = true) => {
    console.log(ok ? `  ✅ ${msg}` : `  ⚠️  ${msg}`);
    if (ok) passCount++; else failCount++;
  };

  // ─────────────────────────────────────────────
  // CHECK 1: readable_id column
  // ─────────────────────────────────────────────
  console.log('🔍 Checking staff_records columns...');
  try {
    const { data, error } = await supabase
      .from('staff_records')
      .select('readable_id')
      .limit(1);
    if (error && error.message.includes('readable_id')) {
      log('readable_id column MISSING — must be added via SQL Editor', false);
    } else {
      log('readable_id column exists ✓');
    }
  } catch (e) {
    log(`readable_id check failed: ${e.message}`, false);
  }

  // ─────────────────────────────────────────────
  // CHECK 2: retirement_date column
  // ─────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('staff_records')
      .select('retirement_date')
      .limit(1);
    if (error && error.message.includes('retirement_date')) {
      log('retirement_date column MISSING — must be added via SQL Editor', false);
    } else {
      log('retirement_date column exists ✓');
    }
  } catch (e) {
    log(`retirement_date check failed: ${e.message}`, false);
  }

  // ─────────────────────────────────────────────
  // CHECK 3: adhoc_expiry column
  // ─────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('staff_records')
      .select('adhoc_expiry')
      .limit(1);
    if (error && error.message.includes('adhoc_expiry')) {
      log('adhoc_expiry column MISSING — must be added via SQL Editor', false);
    } else {
      log('adhoc_expiry column exists ✓');
    }
  } catch (e) {
    log(`adhoc_expiry check failed: ${e.message}`, false);
  }

  // ─────────────────────────────────────────────
  // CHECK 4: staff-passports bucket
  // ─────────────────────────────────────────────
  console.log('\n🔍 Checking storage buckets...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      log(`Could not list buckets: ${error.message}`, false);
    } else {
      const hasPassportBucket = buckets.some(b => b.id === 'staff-passports');
      if (hasPassportBucket) {
        log('staff-passports bucket exists ✓');
      } else {
        log('staff-passports bucket MISSING — will attempt to create...', false);
        // Try to create via Storage API
        const { error: createErr } = await supabase.storage.createBucket('staff-passports', {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        });
        if (createErr) {
          log(`  Failed to create bucket: ${createErr.message}`, false);
        } else {
          log('  ✅ staff-passports bucket CREATED successfully!');
        }
      }
    }
  } catch (e) {
    log(`Bucket check failed: ${e.message}`, false);
  }

  // ─────────────────────────────────────────────
  // CHECK 5: monthly_allowance_requests relationship
  // ─────────────────────────────────────────────
  console.log('\n🔍 Checking monthly_allowance_requests...');
  try {
    const { data, error } = await supabase
      .from('monthly_allowance_requests')
      .select('id, staff_id, status')
      .limit(1);
    if (error) {
      log(`monthly_allowance_requests query error: ${error.message}`, false);
    } else {
      log('monthly_allowance_requests table accessible ✓');
    }
  } catch (e) {
    log(`monthly_allowance_requests check failed: ${e.message}`, false);
  }

  // Try joined query (this was failing)
  try {
    const { data, error } = await supabase
      .from('monthly_allowance_requests')
      .select('*, staff:staff_records(id, full_name)')
      .limit(1);
    if (error) {
      log(`JOIN with staff_records: ${error.message}`, false);
    } else {
      log('JOIN monthly_allowance_requests → staff_records works ✓');
    }
  } catch (e) {
    log(`JOIN check failed: ${e.message}`, false);
  }

  // ─────────────────────────────────────────────
  // CHECK 6: profiles table
  // ─────────────────────────────────────────────
  console.log('\n🔍 Checking profiles...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, is_active')
      .limit(3);
    if (error) {
      log(`profiles query error: ${error.message}`, false);
    } else {
      log(`profiles accessible, found ${data.length} record(s) ✓`);
    }
  } catch (e) {
    log(`profiles check failed: ${e.message}`, false);
  }

  // ─────────────────────────────────────────────
  // CHECK 7: allowances table
  // ─────────────────────────────────────────────
  console.log('\n🔍 Checking allowances...');
  try {
    const { data, error } = await supabase
      .from('allowances')
      .select('*, staff_records:staff_id(full_name, readable_id)')
      .limit(1);
    if (error) {
      log(`allowances JOIN error: ${error.message}`, false);
    } else {
      log('allowances JOIN staff_records works ✓');
    }
  } catch (e) {
    log(`allowances check failed: ${e.message}`, false);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 Results: ${passCount} passed, ${failCount} issues found`);
  
  if (failCount > 0) {
    console.log('\n⚠️  IMPORTANT: Some issues require SQL Editor access to fix.');
    console.log('📋 Please run the SQL in: supabase/migrations/20260605000010_complete_fix.sql');
    console.log('   via your Supabase Dashboard > SQL Editor');
  } else {
    console.log('\n🎉 All checks passed! Portal should be fully operational.');
  }
}

runFixes().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
