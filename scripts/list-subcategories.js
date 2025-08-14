#!/usr/bin/env node
/**
 * Liste les sous-catégories uniques pour une catégorie donnée à partir d'un fichier CSV/TSV.
 * Usage: node scripts/list-subcategories.js "src/components/EXPORT_COMBINE_ARTICLES_DECLINAISONS_avec_sc.csv" "VERRE"
 */
const fs = require('fs');

function normalizeHeader(s) {
  return String(s || '')
    .replace(/^"|"$/g, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripQuotes(s) {
  if (s == null) return '';
  const v = String(s);
  return /^".*"$/.test(v) ? v.replace(/^"|"$/g, '') : v;
}

function sanitizeLabel(s) {
  return String(s || '')
    .replace(/\uFFFD/g, '') // replacement char
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  const file = process.argv[2];
  const wantedCategory = (process.argv[3] || 'VERRE').trim();
  if (!file) {
    console.error('Chemin du fichier requis');
    process.exit(1);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length <= 1) {
    console.error('Fichier vide ou sans données');
    process.exit(1);
  }
  const headLine = lines[0];
  const delimiter = headLine.includes('\t') ? '\t' : (headLine.includes(';') ? ';' : ',');
  const headers = headLine.split(delimiter).map(h => h.trim());
  const norm = headers.map(normalizeHeader);
  const idxCat = norm.findIndex(h => h.includes('nom categorie par defaut') || h === 'categorie');
  const idx1 = norm.findIndex(h => h.includes('sous categorie 1'));
  const idx2 = norm.findIndex(h => h.includes('sous categorie 2'));
  const idx3 = norm.findIndex(h => h.includes('sous categorie 3'));
  if (idxCat === -1) {
    console.error('Colonne "Nom catégorie par défaut" introuvable');
    process.exit(1);
  }
  const targets = [idx1, idx2, idx3].filter(i => i >= 0);
  const set = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter);
    const cat = sanitizeLabel(stripQuotes(cols[idxCat] || ''));
    if (!cat) continue;
    // Comparaison insensible à la casse/accents
    const catKey = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const wantedKey = wantedCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (catKey !== wantedKey) continue;
    for (const t of targets) {
      const val = sanitizeLabel(stripQuotes(cols[t] || ''));
      if (val) set.add(val);
    }
  }
  const list = Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  console.log(JSON.stringify({ category: wantedCategory, count: list.length, subcategories: list }, null, 2));
}

main();


