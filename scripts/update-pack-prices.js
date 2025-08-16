/*
  Met à jour les prix des produits "pack verre" dans le fichier JSON nested.
  Règles demandées (extensibles):
    - 37.5  -> 39
    - 49    -> 51
    - 57    -> 60

  Utilisation:
    node scripts/update-pack-prices.js "base complete 15 aout.nested.json"
*/

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(process.cwd(), 'base complete 15 aout.nested.json');

function normalizeLabel(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tolérance pour les comparaisons flottantes
const EPS = 1e-6;
const approxEq = (a, b) => Math.abs(Number(a) - Number(b)) < EPS;

// Mapping des prix (peut être étendu facilement)
const mappings = [
  { from: 37.5, to: 39 },
  { from: 49,   to: 51 },
  { from: 57,   to: 60 },
];

function mapPrice(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return p;
  for (const { from, to } of mappings) {
    if (approxEq(n, from)) return to;
  }
  return p;
}

function isPackVerre(product) {
  const cat = normalizeLabel(product.category);
  const name = normalizeLabel(product.name);
  const assoc = Array.isArray(product.associatedCategories)
    ? product.associatedCategories.map(normalizeLabel).join(' ') : '';
  // True si on trouve "pack" et "verre" dans la catégorie, le nom ou les catégories associées
  const hay = `${cat} ${name} ${assoc}`;
  return hay.includes('pack') && hay.includes('verre');
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
    console.error('Le fichier nested attend un tableau racine.');
    process.exit(1);
  }

  const backupPath = inputPath.replace(/\.json$/i, `.${new Date().toISOString().replace(/[:.]/g,'-')}.bak.json`);
  fs.writeFileSync(backupPath, raw);

  let updatedProducts = 0;
  let updatedVariations = 0;

  for (const p of data) {
    if (!isPackVerre(p)) continue;

    // Produit
    const before = p.finalPrice;
    const after = mapPrice(before);
    if (after !== before) {
      p.finalPrice = after;
      updatedProducts++;
    }

    // Déclinaisons éventuelles
    if (Array.isArray(p.variations)) {
      for (const v of p.variations) {
        const vb = v.finalPrice;
        const va = mapPrice(vb);
        if (va !== vb) {
          v.finalPrice = va;
          updatedVariations++;
        }
      }
    }
  }

  fs.writeFileSync(inputPath, JSON.stringify(data, null, 2));
  console.log(`OK: ${updatedProducts} produits et ${updatedVariations} déclinaisons mis à jour.`);
  console.log('Backup créé:', path.basename(backupPath));
}

run();


