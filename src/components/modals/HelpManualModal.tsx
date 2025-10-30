import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Divider } from '@mui/material';
import { Download, Close, PictureAsPdf } from '@mui/icons-material';
import { StorageService } from '../../services/StorageService';

declare global {
  interface Window {
    html2canvas?: any;
    jspdf?: any;
  }
}

interface HelpManualModalProps {
  open: boolean;
  onClose: () => void;
}

const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
  const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src === src);
  if (existing) { resolve(); return; }
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error(`Failed to load ${src}`));
  document.body.appendChild(script);
});

const HelpManualModal: React.FC<HelpManualModalProps> = ({ open, onClose }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [imagesBySection, setImagesBySection] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (!open) return;
    try {
      const s = StorageService.loadSettings() || {};
      const imgs = (s as any).helpManualImages || {};
      setImagesBySection(imgs);
    } catch {}
  }, [open]);

  const sections = useMemo(() => ([
    { title: 'Installation et démarrage', points: [
      "Ouvrir l'application via le raccourci ou l'URL (Vercel).",
      "Première utilisation: Paramètres > Restaurer pour importer une sauvegarde JSON (si existante).",
      "Après encaissement, une sauvegarde auto est proposée (JSON horodaté).",
    ]},
    { title: 'Interface (vue globale)', points: [
      'Fenêtres: Produits (catalogue), Panier, Paramètres, Recherche, Statistiques, Import.',
      "Barre du Panier: Récap (aperçu/print), Rem. (remise globale), Reset (vide + remises), Auto (6 verres), Assoc. (seau/vasque), Ticket pro (éditeur pro).",
      "Raccourcis contextuels: clic sur article pour remise ligne (si non exclu).",
    ]},
    { title: 'Produits et Panier (pas à pas)', points: [
      '1) Cliquer un produit pour l’ajouter. S’il a des déclinaisons, choisir la variation.',
      '2) Ajuster quantité avec +/−. Supprimer via la corbeille sur la ligne.',
      "3) Prix final d'une ligne = prix article après remises individuelles et, si applicables, la remise globale (hors exclusions).",
      '4) Les exclusions de remises (catégories/sous‑catégories/produits) empêchent remise ligne/globale si configuré.',
    ]},
    { title: 'Remises (ligne et globale)', points: [
      "Remise individuelle: cliquer l'article (non exclu) → choisir type (€ / % / prix).",
      "Remise globale: bouton Rem. Calcule sur le total des lignes non exclues et sans remise individuelle déjà appliquée.",
      'Exclusions: Paramètres > Exclure catégories (remises) — normalisation des libellés (accents, casse) incluse.',
      'Assistants Auto/Assoc.: Auto (6 verres), Assoc. (compensations seau/vasque) avec règles de non‑cumul paramétrées.',
    ]},
    { title: 'Tickets globaux (historique détaillé)', points: [
      'Filtres: paiement (Espèces/Carte/SumUp/Tous), montants (min/max/exact), dates, heures, client.',
      'Déduplication: fusionne transactions depuis Z/archives et jour en évitant les doublons.',
      "Actions: Modifier (éditeur de ticket), Supprimer (retire de Z + archives), Créer ticket pro (ouvre l'éditeur pro prérempli).",
    ]},
    { title: 'Ticket professionnel (éditeur pro)', points: [
      "Ouverture: depuis le Panier (prérempli), Tickets globaux (prérempli), ou Paramètres (vierge/défauts).",
      'En‑tête: nom boutique, adresse, téléphone, email, site (défauts mémorisables).',
      "Infos: date, heure, N° ticket automatique (yyyymmjj/hh:mm), Réf. commande.",
      'Destinataire: société, contact, adresse, CP, ville, pays, email destinataire, téléphone, TVA intracommunautaire.',
      'Lignes: désignation, quantité, PU TTC, TVA, PU initial barré si remise, ligne “Remise: -X€ (Y%)”.',
      'Remise globale: si présente (ticket source/panier), affichée et déduite du total TTC.',
      'Totaux: Total remises, Total HT, Total TVA (détaillé par taux), Total TTC (ajusté).',
      'Thème: logo (upload), couleurs (primaire/bordure), police CSS, alignement, cadre impression.',
      'Actions: Enregistrer défauts, Enregistrer ticket (consultable dans 📚), Imprimer, Exporter PDF.',
      '📚 Tickets pro enregistrés: rechercher, éditer (réouvrir), exporter (JSON), supprimer.',
    ]},
    { title: 'Sauvegardes, restauration et Z', points: [
      'Sauvegarde manuelle: télécharge le JSON complet (produits, catégories, réglages, sous‑catégories, tickets/jours, clôtures, compteur Z, caissiers, clients, tickets pro).',
      'Restauration: fusion intelligente des clôtures, clients, etc. (préserve existants si possible).',
      'Importer un seul Z: choisit un Z dans un fichier, gère renumérotation en cas de conflit.',
      'Importer tous les Z: prévisualisation avec sélection, import en lot, MAJ transactions_by_day.',
      'Reconstruction: depuis transactions_by_day ou fichiers; nettoyage des doublons Z.',
    ]},
    { title: 'Rapports et exports (précisions)', points: [
      'Récap ventes: agrège sur jour/période/mois/année, filtrage par timestamp des tickets (évite parasites).',
      'Déduplication: clé id@timestamp pour ne compter qu’une fois.',
      'CSV Point 5: colonnes = Produit, Catégorie, ID Produit (4 chiffres), Quantité, Transactions, CA (€).',
      'CSV: encodage UTF‑8 BOM pour Excel (accents/€ corrects).',
    ]},
    { title: 'Clients, catégories et sous‑catégories', points: [
      'Clients: création/édition; récupération rétroactive depuis les tickets si backup ancien.',
      'Catégories/sous‑catégories: gestion et registre synchronisé automatiquement avec les produits.',
    ]},
    { title: 'FAQ (problèmes fréquents)', points: [
      '“Je ne vois pas les ventes après restauration”: utiliser reconstruction Z / vérifier transactions_by_day.',
      '“Les accents sont illisibles dans Excel”: le CSV exporté inclut le BOM UTF‑8; importer via Données > À partir de texte/CSV.',
      '“La remise globale ne s’applique pas”: vérifier exclusions configurées et remises lignes existantes.',
      '“Envoyer le PDF par mail”: exporter PDF puis partager/joindre; (Option) API d’envoi possible (Resend/SendGrid).',
    ]},
    { title: 'Astuces', points: [
      'Gagner du temps: mémoriser les défauts (en‑tête/pied/TVA/thème destinataire) pour les prochains tickets.',
      'Ticket pro depuis un ticket encaissé: passez par Tickets globaux (préremplit PU initial + remises + global).',
      'ID Produit 4 chiffres: l’export CSV invite à compléter si absent.',
    ]},
  ]), []);

  const exportPDF = async () => {
    try {
      if (!window.html2canvas) await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      if (!window.jspdf) await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      const node = ref.current; if (!node) return;
      const canvas = await window.html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      if (imgHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        let remaining = imgHeight;
        const pageImgHeight = pageHeight - margin * 2;
        const imgCanvas = document.createElement('canvas');
        const ctx = imgCanvas.getContext('2d')!;
        const sliceHeightPx = Math.floor(canvas.height * pageImgHeight / imgHeight);
        let offsetY = 0;
        while (remaining > 0) {
          imgCanvas.width = canvas.width;
          imgCanvas.height = sliceHeightPx;
          ctx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
          ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeightPx, 0, 0, imgCanvas.width, imgCanvas.height);
          const sliceData = imgCanvas.toDataURL('image/png');
          pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, pageImgHeight, undefined, 'FAST');
          remaining -= pageImgHeight;
          offsetY += sliceHeightPx;
          if (remaining > 0) pdf.addPage();
        }
      }
      pdf.save('manuel-klick-caisse.pdf');
    } catch {
      alert('❌ Export PDF impossible');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Manuel utilisateur
        <Button onClick={onClose} size="small" startIcon={<Close />}>Fermer</Button>
      </DialogTitle>
      <DialogContent dividers>
        <Box ref={ref} sx={{ p: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>Klick Caisse — Mode d’emploi</Typography>
          <Divider sx={{ mb: 1 }} />
          {sections.map((sec, idx) => (
            <Box key={idx} sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>{sec.title}</Typography>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {sec.points.map((p, i) => (
                  <li key={i}>
                    <Typography variant="body2">{p}</Typography>
                  </li>
                ))}
              </ul>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(imagesBySection[idx] || []).map((src, i) => (
                  <img key={i} src={src} alt={`capture-${idx}-${i}`} style={{ maxWidth: 180, maxHeight: 120, border: '1px solid #ddd', borderRadius: 4 }} />
                ))}
                <Button size="small" variant="outlined" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = () => {
                    const f = (input.files && input.files[0]) || null;
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImagesBySection(prev => {
                        const arr = Array.isArray(prev[idx]) ? [...prev[idx]] : [];
                        arr.push(String(reader.result || ''));
                        return { ...prev, [idx]: arr };
                      });
                    };
                    reader.readAsDataURL(f);
                  };
                  input.click();
                }}>Ajouter capture</Button>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<PictureAsPdf />} variant="contained" onClick={exportPDF}>Exporter en PDF</Button>
        <Button onClick={() => {
          try {
            const s = StorageService.loadSettings() || {};
            StorageService.saveSettings({ ...s, helpManualImages: imagesBySection });
            alert('✅ Captures enregistrées');
          } catch { alert('❌ Erreur enregistrement captures'); }
        }}>Enregistrer captures</Button>
        <Button startIcon={<Download />} onClick={() => {
          try {
            const blob = new Blob([JSON.stringify({ version: 'manuel-1', sections }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'manuel-klick-caisse.json';
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          } catch {}
        }}>Exporter (JSON)</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpManualModal;


