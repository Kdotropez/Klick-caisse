#!/usr/bin/env node
/**
 * Nettoie les colonnes "sous categorie 1/2/3" d'un TSV/CSV en retirant les guillemets entourant les valeurs
 * Usage: node scripts/clean-subcategories.js "src/components/EXPORT_COMBINE_ARTICLES_DECLINAISONS_avec_sc.csv"
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
  if (value == null) return value;
  let s = String(value);
  // Retirer seulement les guillemets englobants
  if (/^".*"$/.test(s)) {
    s = s.replace(/^"|"$/g, '');
  }
  return s;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Chemin du fichier requis');
    process.exit(1);
  }

  const raw = fs.readFileSync(file, 'utf8');
  // Détecter délimiteur: tab prioritaire, sinon ';' puis ','
  const firstLine = raw.split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');

  const lines = raw.split(/\r?\n/);
  if (lines.length <= 1) {
    console.error('Fichier vide ou sans données');
    process.exit(1);
  }

  const headerRaw = lines[0].split(delimiter);
  const headerNorm = headerRaw.map(normalizeHeader);

  // Trouver les indexes des colonnes cible
  const idx1 = headerNorm.findIndex(h => h.includes('sous categorie 1'));
  const idx2 = headerNorm.findIndex(h => h.includes('sous categorie 2'));
  const idx3 = headerNorm.findIndex(h => h.includes('sous categorie 3'));
  const targets = [idx1, idx2, idx3].filter(i => i >= 0);
  if (targets.length === 0) {
    console.log('Aucune colonne sous categorie 1/2/3 trouvée. Rien à faire.');
    process.exit(0);
  }

  const out = [lines[0]]; // garder l'en-tête intact

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { out.push(line); continue; }
    const cols = line.split(delimiter);
    targets.forEach(idx => {
      if (idx < cols.length) {
        cols[idx] = stripQuotes(cols[idx]);
      }
    });
    out.push(cols.join(delimiter));
  }

  // Sauvegarde
  const dir = path.dirname(file);
  const base = path.basename(file);
  const ts = new Date();
  const stamp = [
    ts.getFullYear(), String(ts.getMonth() + 1).padStart(2, '0'), String(ts.getDate()).padStart(2, '0'),
    '-', String(ts.getHours()).padStart(2, '0'), String(ts.getMinutes()).padStart(2, '0'), String(ts.getSeconds()).padStart(2, '0')
  ].join('');
  const backup = path.join(dir, base + `.backup-${stamp}`);
  fs.writeFileSync(backup, raw, 'utf8');
  fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log(`Nettoyage terminé. Sauvegarde: ${backup}`);
}

main();


