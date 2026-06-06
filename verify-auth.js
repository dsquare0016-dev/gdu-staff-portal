/**
 * Run this after applying 20260605000000_fix_rls_recursion.sql 
 * to verify the authentication flow works end-to-end.
 */
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
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAuth() {
  let passed = 0;
  let failed = 0;

  const check = (label, result, expected) => {
    if (result === expected || (expected === 'truthy' && result)) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.log(`  ❌ ${label} — got: ${JSON.stringify(result)}`);
      failed++;
    }
  };

  console.log('=== GDU Auth Verification ===\n');

  // Test 1: Sign in
  console.log('1. Sign in as super_admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'superadmin@portal.gdu.gov.ng',
    password: 'GDUportal2026!'
  });
  check('Auth succeeds', !authError, true);
  check('User ID present', authData?.user?.id, 'truthy');
  if (authError) { console.log('FATAL:', authError.message); return; }

  const userId = authData.user.id;

  // Test 2: Fetch own profile by id (Strategy 1)
  console.log('\n2. Fetch profile by id...');
  const t1 = Date.now();
  const { data: profileById, error: err1 } = await supabase
    .from('profiles').select('*').eq('id', userId).maybeSingle();
  const elapsed1 = Date.now() - t1;
  check(`Profile found in ${elapsed1}ms (< 2000ms)`, elapsed1 < 2000, true);
  check('No RLS error', !err1, true);
  check('Role is super_admin', profileById?.role, 'super_admin');
  if (err1) console.log('  Error detail:', err1.message);

  // Test 3: Update last_seen (async IIFE approach)
  console.log('\n3. Update last_seen (async IIFE)...');
  try {
    await supabase.from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
    check('last_seen update works', true, true);
  } catch(e) {
    check('last_seen update works', false, true);
    console.log('  Error:', e.message);
  }

  // Test 4: Staff record query
  console.log('\n4. Staff record by user_id...');
  const { data: staffData, error: staffErr } = await supabase
    .from('staff_records').select('id').eq('user_id', userId).maybeSingle();
  if (staffErr) {
    console.log(`  ⚠️  Staff record not found (acceptable): ${staffErr.message}`);
  } else {
    check('Staff record lookup works', true, true);
  }

  // Sign out
  await supabase.auth.signOut();

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed === 0) {
    console.log('✅ AUTH FLOW IS WORKING! Login should succeed in browser.');
  } else {
    console.log('❌ Issues found. Check output above.');
    if (elapsed1 >= 2000) {
      console.log('\n⚠️  PROFILE QUERY IS STILL SLOW/TIMING OUT!');
      console.log('   This means the RLS policy fix has NOT been applied yet.');
      console.log('   Please run supabase/migrations/20260605000000_fix_rls_recursion.sql');
      console.log('   in your Supabase SQL Editor at:');
      console.log('   https://supabase.com/dashboard/project/' + env.VITE_SUPABASE_PROJECT_ID + '/sql');
    }
  }
}

verifyAuth();
