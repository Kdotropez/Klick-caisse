#!/usr/bin/env node
/**
 * Normalise les colonnes "sous categorie 1/2/3" dans un CSV/TSV:
 * - retire les guillemets englobants
 * - supprime les "?" résiduels
 * - corrige certaines fautes courantes (WHYSKY -> WHISKY)
 * - nettoie espaces et caractères de contrôle
 * Usage: node scripts/normalize-subcategories.js "src/components/EXPORT_COMBINE_ARTICLES_DECLINAISONS_avec_sc.csv"
 */

const fs = require('fs');
const path = require('path');

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

function stripQuotes(value) {
  if (value == null) return '';
  const s = String(value);
  return /^".*"$/.test(s) ? s.replace(/^"|"$/g, '') : s;
}

function sanitize(s) {
  return String(s || '')
    .replace(/[\uFFFD]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/["']/g, '')
    .replace(/[?]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyCorrections(label) {
  let s = label;
  // Corrections spécifiques
  s = s.replace(/\bWHYSKY\b/gi, 'WHISKY');
  // Unifier libellés VERRE <nombre,decimales> (laisser la virgule telle quelle)
  s = s.replace(/\b(VERRE)\s*(\d+)[\s]*[,\.][\s]*(\d{1,2})\b/gi, (m, a, b, c) => `${a} ${b},${c}`);
  // Nettoyer double espaces
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Chemin du fichier requis');
    process.exit(1);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);
  if (lines.length <= 1) {
    console.error('Fichier vide ou sans données');
    process.exit(1);
  }
  const head = lines[0];
  const delimiter = head.includes('\t') ? '\t' : (head.includes(';') ? ';' : ',');
  const headerRaw = head.split(delimiter);
  const headerNorm = headerRaw.map(normalizeHeader);
  const idx1 = headerNorm.findIndex(h => h.includes('sous categorie 1'));
  const idx2 = headerNorm.findIndex(h => h.includes('sous categorie 2'));
  const idx3 = headerNorm.findIndex(h => h.includes('sous categorie 3'));
  const targets = [idx1, idx2, idx3].filter(i => i >= 0);
  if (targets.length === 0) {
    console.log('Aucune colonne sous categorie 1/2/3 trouvée. Rien à faire.');
    process.exit(0);
  }

  const out = [lines[0]];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { out.push(line); continue; }
    const cols = line.split(delimiter);
    targets.forEach(idx => {
      if (idx < cols.length) {
        const v = stripQuotes(cols[idx]);
        const cleaned = applyCorrections(sanitize(v));
        cols[idx] = cleaned;
      }
    });
    out.push(cols.join(delimiter));
  }

  const dir = path.dirname(file);
  const base = path.basename(file);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
  const backup = path.join(dir, `${base}.backup-${stamp}`);
  fs.writeFileSync(backup, raw, 'utf8');
  fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log(`Normalisation terminée. Sauvegarde: ${backup}`);
}

main();


