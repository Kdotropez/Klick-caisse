// Registre par défaut des sous-catégories
// Alimenté automatiquement depuis la base intégrée pour que la prod (Vercel) dispose
// d'un premier jeu de sous-catégories même sans import manuel
import embeddedBase from '../components/base complete 15 aout.nested.json';

// Sanitize minimal local (évite dépendance circulaire avec StorageService)
const sanitize = (input: string): string => {
  try {
    let s = (input || '').toString();
    // Supprimer caractères de contrôle et BOM
    // eslint-disable-next-line no-control-regex
    s = s.replace(/[\x00-\x1F\x7F]/g, '').replace(/\uFEFF/g, '');
    // Normaliser espaces
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  } catch { return String(input || '').trim(); }
};

const fromEmbedded = (() => {
  try {
    const set = new Set<string>();
    (embeddedBase as any[]).forEach((it: any) => {
      const raw = (it && it.sousCategorie) ? String(it.sousCategorie) : '';
      const clean = sanitize(raw);
      if (clean) set.add(clean);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  } catch { return []; }
})();

export const defaultSubcategoriesRegistry: string[] = fromEmbedded;



