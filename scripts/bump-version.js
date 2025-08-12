// bump-version.js — incrémente src/version.ts d'un dixième (x.y -> x.(y+1))
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'version.ts');
let content = fs.readFileSync(file, 'utf8');

const match = content.match(/APP_VERSION\s*=\s*'([0-9]+)\.([0-9]+)'/);
if (!match) {
  console.error('APP_VERSION introuvable dans src/version.ts');
  process.exit(1);
}
let major = parseInt(match[1], 10);
let minor = parseInt(match[2], 10);
minor += 1;
const next = `${major}.${minor}`;
content = content.replace(/APP_VERSION\s*=\s*'[^']+'/, `APP_VERSION = '${next}'`);
fs.writeFileSync(file, content, 'utf8');
console.log('Version incrémentée ->', next);


