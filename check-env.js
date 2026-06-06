import fs from 'fs';
import path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  console.log('--- .env content lines ---');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const parts = line.split('=');
      console.log(`${parts[0]}: ${parts[1] ? 'defined (length ' + parts[1].trim().length + ')' : 'undefined'}`);
    }
  });
} else {
  console.log('.env file does not exist');
}

console.log('\n--- process.env keys ---');
console.log(Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE') || k.includes('PORTAL')));
