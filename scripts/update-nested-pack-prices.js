/*
  Met à jour les prix dans un fichier nested (tableau d'objets) au format:
  {
    type: 'ARTICLE',
    productId: '7720',
    nom: '...',
    categorie: 'PACK VERRE',
    prixTTC: '37,50',
    sousCategorie: 'PACK 6.5',
    variants: []
  }

  Règles:
    - 37,50 → 39,00
    - 49,00 → 51,00
    - 57,00 → 60,00

  Utilisation:
    node scripts/update-nested-pack-prices.js "base complete 15 aout.nested.json"
*/

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(process.cwd(), 'base complete 15 aout.nested.json');

const mappings = [
  { from: 37.5, to: 39 },
  { from: 49, to: 51 },
  { from: 57, to: 60 },
];

const EPS = 1e-6;
const approxEq = (a, b) => Math.abs(Number(a) - Number(b)) < EPS;

function normalizeLabel(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function parseEuroToNumber(v) {
  if (v == null) return NaN;
  const s = String(v).replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function formatEuroString(n) {
  return n.toFixed(2).replace('.', ',');
}

function mapPriceNum(n) {
  for (const { from, to } of mappings) {
    if (approxEq(n, from)) return to;
  }
  return n;
}

function run() {
  if (!fs.existsSync(inputPath)) {
    console.error('Fichier introuvable:', inputPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(inputPath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('JSON invalide:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error('Le JSON nested doit être un tableau.');
    process.exit(1);
  }

  const backupPath = inputPath.replace(/\.json$/i, `.${new Date().toISOString().replace(/[:.]/g,'-')}.bak.json`);
  fs.writeFileSync(backupPath, raw);

  let updated = 0;
  for (const obj of data) {
    const hay = normalizeLabel(`${obj.categorie} ${obj.nom} ${(obj.sousCategorie||'')}`);
    const isPackVerre = hay.includes('pack') && hay.includes('verre');
    if (!isPackVerre) continue;

    const n = parseEuroToNumber(obj.prixTTC);
    if (!Number.isFinite(n)) continue;
    const mapped = mapPriceNum(n);
    if (!approxEq(mapped, n)) {
      obj.prixTTC = formatEuroString(mapped);
      updated++;
    }
  }

  fs.writeFileSync(inputPath, JSON.stringify(data, null, 2));
  console.log(`OK nested: ${updated} lignes mises à jour. Backup: ${path.basename(backupPath)}`);
}

run();


