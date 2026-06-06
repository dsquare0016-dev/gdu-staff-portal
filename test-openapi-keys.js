import fs from 'fs';
const spec = JSON.parse(fs.readFileSync('openapi-spec.json', 'utf8'));
console.log('Error details:', spec);
