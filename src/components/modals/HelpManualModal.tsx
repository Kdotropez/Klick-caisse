import React, { useMemo, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Divider } from '@mui/material';
import { Download, Close, PictureAsPdf } from '@mui/icons-material';

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

  const sections = useMemo(() => ([
    { title: 'Installation et démarrage', points: [
      "Ouvrir l'application via le raccourci ou l'URL.",
      "Importer une sauvegarde JSON si nécessaire (Paramètres > Restaurer).",
    ]},
    { title: 'Interface', points: [
      'Fenêtres: Produits, Panier, Paramètres, Recherche, Statistiques, Import.',
      "Barre du Panier: Récap, Rem., Reset, Auto, Assoc., Ticket pro.",
    ]},
    { title: 'Produits et Panier', points: [
      'Cliquer un produit pour ajouter au panier; choisir la variation si proposée.',
      'Ajuster les quantités; supprimer via la corbeille.',
    ]},
    { title: 'Remises', points: [
      "Remise ligne: cliquer l'article (si non exclu) → €/%/prix.",
      'Remise globale: bouton Rem., respectant les exclusions configurées.',
      'Exclusions: Paramètres > Exclure catégories (remises).',
    ]},
    { title: 'Tickets globaux', points: [
      'Paramètres > Tickets globaux: filtres par montant, date/heure, paiement, client.',
      'Créer un Ticket pro depuis un ticket encaissé: cocher > Créer ticket pro.',
    ]},
    { title: 'Ticket professionnel', points: [
      'Ouvrir via Panier (Ticket pro), Tickets globaux (Créer), ou Paramètres.',
      'Contenu: en‑tête, infos, destinataire, lignes (PU, TVA), remises (ligne+globale), totaux.',
      'N° ticket auto: yyyymmjj/hh:mm.',
      'Thème: logo, couleurs, police, alignement, cadre impression.',
      'Actions: Enregistrer défauts, Enregistrer ticket, Imprimer, Exporter PDF.',
      'Tickets pro enregistrés: Paramètres > 📚 Tickets pro (rechercher/éditer/exporter/supprimer).',
    ]},
    { title: 'Sauvegardes et Z', points: [
      'Sauvegarde manuelle/auto; restauration; import Z (un ou tous) avec renumérotation.',
      'Reconstruction Z depuis archives; nettoyage doublons.',
    ]},
    { title: 'Rapports et exports', points: [
      'Récap ventes (jour/période) avec déduplication.',
      'CSV Point 5: Produit, Catégorie, ID Produit (4 chiffres), Quantité, Transactions, CA (€), UTF‑8 BOM.',
    ]},
    { title: 'Clients et catégories', points: [
      'Gestion clients; récupération depuis tickets si nécessaire.',
      'Gestion catégories/sous‑catégories; registre synchronisé.',
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
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<PictureAsPdf />} variant="contained" onClick={exportPDF}>Exporter en PDF</Button>
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


