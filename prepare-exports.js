// Préparation des exports: nettoyage + mapping EAN (identifiant mère)
// Entrées attendues dans le dossier courant:
// - EXPORT VF ARTICLE WYSIWYG.csv
// - EXPORT VF DECLINAISONS WYSIWYG.csv
// - code barre pour synchro.csv  (colonnes: Identifiant produit;ean13)

const fs = require('fs');
const path = require('path');

function detectDelimiter(headerLine) {
  if (headerLine.includes('\t')) return '\t';
  if (headerLine.includes(';')) return ';';
  return ',';
}

function sanitizeText(text) {
  // Enlever BOM, caractères de contrôle, garder accents
  return String(text)
    .replace(/\uFEFF/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\uFFFD/g, '');
}

function normalizeHeader(h) {
  const s = sanitizeText(h).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
  return s;
}

function to13Digits(raw) {
  if (!raw) return '';
  let s = String(raw).trim().replace(/\s+/g, '');
  s = s.replace(/,/g, '.');
  // Notation scientifique éventuelle
  if (/^\d+(?:\.\d+)?e[+\-]?\d+$/i.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) s = String(Math.round(n));
  }
  s = s.replace(/\D/g, '');
  if (s.length > 13) s = s.slice(0, 13);
  return s;
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) throw new Error(`Fichier vide: ${filePath}`);
  const delim = detectDelimiter(lines[0]);
  const rows = lines.map(l => l.split(delim).map(sanitizeText));
  return { delim, rows };
}

function writeCsv(filePath, delim, rows) {
  const out = rows.map(r => r.join(delim)).join('\r\n');
  fs.writeFileSync(filePath, out, 'utf8');
}

function loadEanMapping(mappingPath) {
  const { delim, rows } = readCsv(mappingPath);
  const header = rows[0].map(normalizeHeader);
  const idxId = header.findIndex(h => h.includes('identifiant produit') || h === 'id' || h.includes('id product'));
  const idxEan = header.findIndex(h => h === 'ean13' || h.includes('ean'));
  if (idxId === -1 || idxEan === -1) throw new Error('Mapping: colonnes (Identifiant produit / ean13) introuvables');
  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const pid = (rows[i][idxId] || '').trim();
    const ean = to13Digits(rows[i][idxEan] || '');
    if (pid) map.set(pid, ean);
  }
  return map;
}

function cleanLabel(value) {
  let s = sanitizeText(value);
  // Corrections ciblées signalées
  s = s.replace(/\bpalid\b/gi, 'plaid');
  s = s.replace(/\bverre\s*650\b/gi, 'verre 6.50');
  // Espaces multiples
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function processArticles(src, mapping) {
  const { delim, rows } = readCsv(src);
  const header = rows[0];
  const norm = header.map(normalizeHeader);
  console.log('Articles header:', header);
  console.log('Articles norm  :', norm);
  // Trouver Index colonne catégorie par défaut (tolérant, ignorer colonnes "sous categorie ...")
  let idxCategory = norm.findIndex(h => /^(nom )?cat(?:e)?gorie par d(?:e)?faut$/.test(h));
  if (idxCategory === -1) {
    idxCategory = norm.findIndex(h => h.includes('cat') && h.includes('gorie') && h.includes('faut') && !h.includes('sous'));
  }
  // Identifiant produit
  let idxId = norm.findIndex(h => h.includes('identifiant produit') || h === 'id' || h.includes('id product'));
  if (idxId === -1) idxId = norm.findIndex(h => h.includes('identifiant') && h.includes('produit'));
  // ean13 (peut être absent → on créera la colonne)
  let idxEan = norm.findIndex(h => h === 'ean13' || h.includes('ean'));
  const optionalSubs = norm
    .map((h, i) => ({ h, i }))
    .filter(x => x.h.includes('sous') && x.h.includes('categorie'))
    .map(x => x.i);
  if (idxCategory === -1 && idxId !== -1) {
    // Fallback: la colonne juste après Identifiant produit ressemble à la catégorie par défaut dans l'export fourni
    if (idxId + 1 < norm.length) idxCategory = idxId + 1;
  }
  if (idxCategory === -1 || idxId === -1) throw new Error('Articles: colonnes clefs introuvables (Identifiant produit / Nom catégorie par défaut)');

  const out = [header.slice()];
  let updatedEans = 0;
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].slice();
    // Nettoyage catégories et sous-catégories
    cols[idxCategory] = cleanLabel(cols[idxCategory] || '');
    for (const idx of optionalSubs) if (idx !== -1) cols[idx] = cleanLabel(cols[idx] || '');
    // Appliquer mapping EAN
    if (idxEan === -1) {
      // Créer colonne ean13 en fin de ligne
      if (out.length === 1) {
        header.push('ean13');
        idxEan = header.length - 1;
      }
      cols[idxEan] = '';
    }
    const pid = (cols[idxId] || '').trim();
    if (pid && mapping.has(pid)) {
      const ean = mapping.get(pid);
      if (ean) {
        cols[idxEan] = ean;
        updatedEans += 1;
      }
    }
    // Normaliser à 13 chiffres
    cols[idxEan] = to13Digits(cols[idxEan] || '');
    out.push(cols);
  }
  return { delim, rows: out, updatedEans };
}

function processDeclinaisons(src) {
  const { delim, rows } = readCsv(src);
  const header = rows[0];
  const norm = header.map(normalizeHeader);
  console.log('Decli header:', header);
  console.log('Decli norm  :', norm);
  let idxPid = norm.findIndex(h => h.includes('identifiant produit') || h.includes('id product') || h === 'id');
  if (idxPid === -1) idxPid = norm.findIndex(h => h.includes('identifiant') && h.includes('produit'));
  let idxVar = norm.findIndex(h => h.includes('identifiant declinaison') || h.includes('id declinaison') || h.includes('id combination') || h.includes('declinaison'));
  if (idxVar === -1) idxVar = norm.findIndex(h => h.includes('identifiant') && (h.includes('declinaison') || h.includes('combinaison')));
  let idxEan = norm.findIndex(h => h.includes('ean13') || h.includes('ean'));
  if (idxPid === -1 && norm.length > 2) idxPid = 2; // heuristique: 3e colonne
  if (idxVar === -1 && norm.length > 3) idxVar = 3; // heuristique: 4e colonne
  if (idxPid === -1 || idxVar === -1) throw new Error('Déclinaisons: colonnes clefs introuvables (Identifiant produit / Identifiant déclinaison)');

  const out = [header.slice()];
  let normalizedEans = 0;
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].slice();
    if (idxEan !== -1) {
      const before = cols[idxEan] || '';
      const after = to13Digits(before);
      if (before && before !== after) normalizedEans += 1;
      cols[idxEan] = after;
    }
    out.push(cols);
  }
  return { delim, rows: out, normalizedEans };
}

function main() {
  const root = process.cwd();
  const files = {
    articles: path.join(root, 'EXPORT VF ARTICLE WYSIWYG.csv'),
    declinaison: path.join(root, 'EXPORT VF DECLINAISONS WYSIWYG.csv'),
    mapping: path.join(root, 'code barre pour synchro.csv')
  };
  if (!fs.existsSync(files.articles)) throw new Error('Manque le fichier Articles');
  if (!fs.existsSync(files.declinaison)) throw new Error('Manque le fichier Déclinaisons');
  if (!fs.existsSync(files.mapping)) throw new Error('Manque le fichier mapping EAN');

  const mapping = loadEanMapping(files.mapping);
  const art = processArticles(files.articles, mapping);
  const dec = processDeclinaisons(files.declinaison);

  const outArticles = path.join(root, 'EXPORT VF ARTICLE WYSIWYG.final.csv');
  const outDecli = path.join(root, 'EXPORT VF DECLINAISONS WYSIWYG.final.csv');
  writeCsv(outArticles, art.delim, art.rows);
  writeCsv(outDecli, dec.delim, dec.rows);
  console.log('OK: Articles ->', path.basename(outArticles), '| EAN mis à jour:', art.updatedEans);
  console.log('OK: Declinaisons ->', path.basename(outDecli), '| EAN normalisés:', dec.normalizedEans);
}

try {
  main();
} catch (e) {
  console.error('Erreur:', e && e.message ? e.message : e);
  process.exit(1);
}


