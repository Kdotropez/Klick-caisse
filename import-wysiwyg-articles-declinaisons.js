/*
  Import Prestashop WYSIWYG exports (articles + déclinaisons) into src/data/productionData.ts
  Inputs expected in workspace root:
    - EXPORT VF ARTICLE WYSIWYG.csv
    - EXPORT VF DECLINAISONS WYSIWYG.csv
*/

const fs = require('fs');
const path = require('path');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`❌ Fichier introuvable: ${filePath}`);
    process.exit(1);
  }
}

function detectDelimiter(headerLine) {
  const candidates = ['\t', ';', ','];
  let best = ',';
  let bestCount = 0;
  for (const d of candidates) {
    const c = headerLine.split(d).length;
    if (c > bestCount) { bestCount = c; best = d; }
  }
  return best;
}

function parseCSVSmart(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delim = detectDelimiter(lines[0]);
  const headers = lines[0].split(delim).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const parts = raw.split(delim).map(v => v.replace(/^"|"$/g, '').trim());
    // Pad or trim to headers length
    while (parts.length < headers.length) parts.push('');
    while (parts.length > headers.length) parts.pop();
    const row = {};
    headers.forEach((h, idx) => { row[h] = parts[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function norm(s) {
  return String(s || '').trim();
}

function toFloat(s) {
  const t = String(s || '').replace(',', '.');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

console.log('📥 Lecture des exports WYSIWYG...');
const articlesPath = path.join(process.cwd(), 'EXPORT VF ARTICLE WYSIWYG.csv');
const declsPath = path.join(process.cwd(), 'EXPORT VF DECLINAISONS WYSIWYG.csv');
const artContent = readFileSafe(articlesPath);
const decContent = readFileSafe(declsPath);

const art = parseCSVSmart(artContent);
const dec = parseCSVSmart(decContent);

function findHeader(headers, candidates) {
  const low = headers.map(h => h.toLowerCase());
  for (const c of candidates) {
    const idx = low.indexOf(c.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return null;
}

const artMap = {
  id: findHeader(art.headers, ['Identifiant produit','id product','id']),
  name: findHeader(art.headers, ['Nom','name']),
  category: findHeader(art.headers, ['catégorie par défaut','nom catégorie par défaut','default category','categorie par defaut']),
  associated: findHeader(art.headers, ['catégories associées','categories associees','associated categories']),
  finalPrice: findHeader(art.headers, ['Prix de vente TTC final','price ttc final','price ttc']),
  wholesale: findHeader(art.headers, ['Prix de vente HT','prix ht','wholesale_price']),
  ean13: findHeader(art.headers, ['ean13','ean']),
  reference: findHeader(art.headers, ['Référence','reference'])
};

const decMap = {
  productId: findHeader(dec.headers, ['Identifiant produit','id product','id']),
  varId: findHeader(dec.headers, ['Identifiant déclinaison','id declinaison','id combination','id_combination']),
  attributes: findHeader(dec.headers, ['Liste des attributs','attributes','attribute(s)']),
  ean13: findHeader(dec.headers, ['ean13 décl.','ean13 decl.','ean13']),
  reference: findHeader(dec.headers, ['Référence déclinaison','reference declinaison','reference']),
  impactTtc: findHeader(dec.headers, ['Impact sur prix de vente TTC','impact ttc','impact sur prix de vente (ht/ttc suivant ps version)'])
};

console.log('🧭 Mapping détecté:', { artMap, decMap });

const categories = [];
const categorySet = new Set();
const products = [];

// Index declinaisons par produit
const declByProduct = new Map();
for (const r of dec.rows) {
  const pid = norm(r[decMap.productId] || '');
  if (!pid) continue;
  const list = declByProduct.get(pid) || [];
  list.push({
    id: norm(r[decMap.varId] || `var_${Date.now()}`),
    attributes: norm(r[decMap.attributes] || ''),
    ean13: norm(r[decMap.ean13] || ''),
    reference: norm(r[decMap.reference] || ''),
    impactTtc: toFloat(r[decMap.impactTtc] || 0)
  });
  declByProduct.set(pid, list);
}

for (const r of art.rows) {
  const id = norm(r[artMap.id] || `prod_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
  const name = norm(r[artMap.name] || 'Produit sans nom');
  const category = norm(r[artMap.category] || 'Général');
  const associated = norm(r[artMap.associated] || '');
  const finalPrice = toFloat(r[artMap.finalPrice] || 0);
  const wholesalePrice = toFloat(r[artMap.wholesale] || 0) || Math.max(0, finalPrice * 0.8);
  const ean13 = norm(r[artMap.ean13] || '');
  const reference = norm(r[artMap.reference] || '');

  if (!categorySet.has(category)) {
    categorySet.add(category);
    categories.push({ id: `cat_${categories.length+1}`, name: category, color: undefined, productOrder: [] });
  }

  const variationsRaw = declByProduct.get(id) || [];
  const variations = variationsRaw.map(v => ({
    id: v.id || `var_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    ean13: v.ean13,
    reference: v.reference,
    attributes: v.attributes,
    priceImpact: v.impactTtc,
    finalPrice: Math.max(0, finalPrice + v.impactTtc)
  }));

  const associatedCategories = associated
    ? associated.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  products.push({
    id,
    name,
    reference,
    ean13,
    category,
    associatedCategories,
    wholesalePrice,
    finalPrice,
    crossedPrice: finalPrice,
    salesCount: 0,
    position: 0,
    remisable: true,
    variations
  });
}

const outputPath = path.join(__dirname, 'src', 'data', 'productionData.ts');
const output = `// Généré par import-wysiwyg-articles-declinaisons.js le ${new Date().toISOString()}
import type { Product, Category } from '../types/Product';

export const products: Product[] = ${JSON.stringify(products, null, 2)} as any;
export const categories: Category[] = ${JSON.stringify(categories, null, 2)} as any;

export default { products, categories };
`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`✅ Données écrites dans ${outputPath}`);
console.log(`🛍️ Produits: ${products.length}, 🏷️ Catégories: ${categories.length}`);


