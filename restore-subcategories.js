// Reconstruit un registre de sous-catégories à partir des fichiers TS de src/data/
// Écrit src/data/subcategoriesRegistry.ts

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'src', 'data');
const outFile = path.join(dataDir, 'subcategoriesRegistry.ts');

function collectFromContent(content) {
  const results = new Map(); // key: normalized, value: canonical
  const sanitizeLabel = (s) => {
    return String(s)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')   // supprime caractères de contrôle
      .replace(/\uFFFD/g, '')                     // enlève le � (replacement char)
      .replace(/[“”]/g, '"')
      .replace(/[’]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  };
  // Trouver tous les blocs "associatedCategories": [ ... ]
  const arrayRegex = /"associatedCategories"\s*:\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = arrayRegex.exec(content)) !== null) {
    const inner = m[1];
    // Extraire toutes les chaînes "..."
    const strRegex = /"([^"\n\r]+)"/g;
    let s;
    while ((s = strRegex.exec(inner)) !== null) {
      const raw = s[1];
      const val = sanitizeLabel(raw);
      if (!val) continue;
      const key = val.toLowerCase();
      if (!results.has(key)) results.set(key, val);
    }
  }
  return new Set([...results.values()]);
}

function main() {
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.ts'))
    .filter(f => f.includes('productionData'));

  const all = new Set();
  for (const f of files) {
    try {
      const p = path.join(dataDir, f);
      const content = fs.readFileSync(p, 'utf8');
      const set = collectFromContent(content);
      set.forEach(v => all.add(v));
    } catch (e) {
      console.error('Erreur lecture', f, e.message);
    }
  }

  const arr = Array.from(all)
    .map((s) => s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const header = '// Fichier généré automatiquement par restore-subcategories.js\n';
  const body = `export const defaultSubcategoriesRegistry: string[] = ${JSON.stringify(arr, null, 2)};\n`;
  fs.writeFileSync(outFile, header + body, 'utf8');
  console.log(`✅ Écrit ${outFile} avec ${arr.length} sous-catégories.`);
}

main();


