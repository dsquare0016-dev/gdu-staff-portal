const fs = require('fs');
const path = require('path');

const clientDist = path.join(process.cwd(), 'dist', 'client');
const vercelStatic = path.join(process.cwd(), '.vercel', 'output', 'static');

console.log('Ensuring Vercel static assets are correctly placed...');

if (!fs.existsSync(clientDist)) {
  console.error('Error: dist/client directory not found. Did the Vite build run?');
  process.exit(1);
}

if (!fs.existsSync(vercelStatic)) {
  fs.mkdirSync(vercelStatic, { recursive: true });
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  copyRecursiveSync(clientDist, vercelStatic);
  console.log('Successfully copied assets from dist/client to .vercel/output/static');
  
  // Also ensure public folder is there if it wasn't already picked up
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    copyRecursiveSync(publicDir, vercelStatic);
    console.log('Successfully merged public folder into .vercel/output/static');
  }
} catch (err) {
  console.error('Error copying assets:', err);
  process.exit(1);
}
