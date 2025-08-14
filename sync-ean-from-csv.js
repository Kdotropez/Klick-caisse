// Script: Synchroniser les EAN des articles depuis "code barre pour synchro.csv"
// - Lit le mapping (Identifiant produit;ean13)
// - Met à jour la colonne ean13 dans "EXPORT VF ARTICLE WYSIWYG.csv" en se basant sur Identifiant produit
// - Crée un backup de l'export avant réécriture

const fs = require('fs');
const path = require('path');

function detectDelimiter(headerLine) {
  if (headerLine.includes('\t')) return '\t';
  if (headerLine.includes(';')) return ';';
  return ',';
}

function normalizeHeader(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) throw new Error(`Fichier vide: ${filePath}`);
  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map(l => l.split(delimiter).map(c => c.replace(/[\x00-\x1F\x7F-\x9F]/g,'').replace(/\uFEFF/g,'').trim()));
  return { delimiter, rows };
}

function writeCsv(filePath, delimiter, rows) {
  const out = rows.map(r => r.join(delimiter)).join('\r\n');
  fs.writeFileSync(filePath, out, 'utf8');
}

function main() {
  const repoRoot = process.cwd();
  const mappingFile = path.join(repoRoot, 'code barre pour synchro.csv');
  const exportArticlesFile = path.join(repoRoot, 'EXPORT VF ARTICLE WYSIWYG.csv');

  if (!fs.existsSync(mappingFile)) {
    console.error(`Fichier introuvable: ${mappingFile}`);
    process.exit(1);
  }
  if (!fs.existsSync(exportArticlesFile)) {
    console.error(`Fichier introuvable: ${exportArticlesFile}`);
    process.exit(1);
  }

  // Lire mapping
  const { delimiter: mapDelim, rows: mapRows } = readCsv(mappingFile);
  const mapHeader = mapRows[0];
  const mapHeaderNorm = mapHeader.map(normalizeHeader);
  const mapIdxId = mapHeaderNorm.findIndex(h => h.includes('identifiant produit') || h.includes('id product') || h === 'id');
  const mapIdxEan = mapHeaderNorm.findIndex(h => h === 'ean13' || h.includes('ean'));
  if (mapIdxId === -1 || mapIdxEan === -1) {
    throw new Error('Colonnes mapping non trouvées (Identifiant produit / ean13)');
  }
  const idToEan = new Map();
  for (let i = 1; i < mapRows.length; i++) {
    const row = mapRows[i];
    const pid = (row[mapIdxId] || '').trim();
    const ean = (row[mapIdxEan] || '').trim();
    if (pid) idToEan.set(pid, ean);
  }

  // Lire export articles
  const { delimiter: expDelim, rows: expRows } = readCsv(exportArticlesFile);
  const expHeader = expRows[0];
  const expHeaderNorm = expHeader.map(normalizeHeader);
  const expIdxId = expHeaderNorm.findIndex(h => h.includes('identifiant produit') || h.includes('id product') || h === 'id');
  const expIdxEan = expHeaderNorm.findIndex(h => h === 'ean13' || h.includes('ean'));
  if (expIdxId === -1 || expIdxEan === -1) {
    throw new Error('Colonnes export non trouvées (Identifiant produit / ean13)');
  }

  // Backup
  const backupPath = exportArticlesFile.replace(/\.csv$/i, `.backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`);
  fs.copyFileSync(exportArticlesFile, backupPath);

  // Appliquer remplacements
  let updatedCount = 0;
  for (let i = 1; i < expRows.length; i++) {
    const row = expRows[i];
    const pid = (row[expIdxId] || '').trim();
    if (!pid) continue;
    if (idToEan.has(pid)) {
      row[expIdxEan] = idToEan.get(pid) || '';
      updatedCount++;
    }
  }

  writeCsv(exportArticlesFile, expDelim, expRows);
  console.log(`Synchronisation terminée: ${updatedCount} lignes mises à jour. Backup: ${path.basename(backupPath)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e && e.message ? e.message : e);
    process.exit(1);
  }
}


