import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  FormControlLabel,
  Switch,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Close, Delete, Print, Save, Download } from '@mui/icons-material';
import { StorageService } from '../../services/StorageService';

// Déclarations globales pour chargement CDN
declare global {
  interface Window {
    html2canvas?: any;
    jspdf?: any;
  }
}

interface ProReceiptModalProps {
  open: boolean;
  onClose: () => void;
}

type ReceiptItem = {
  description: string;
  quantity: number; // quantité
  unitPrice: number; // prix unitaire TTC
  taxRate: number; // TVA en %
};

export const ProReceiptModal: React.FC<ProReceiptModalProps> = ({ open, onClose }) => {
  const receiptRef = React.useRef<HTMLDivElement | null>(null);

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

  const exportPDF = async () => {
    try {
      // Charger html2canvas et jsPDF depuis CDN si nécessaires
      if (!window.html2canvas) {
        await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      }
      if (!window.jspdf) {
        await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      }
      const node = receiptRef.current;
      if (!node) { alert('Aperçu introuvable'); return; }
      const canvas = await window.html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let y = margin;
      if (imgHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        // Multi-page simple si le ticket est plus long
        let remaining = imgHeight;
        let position = margin;
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
          pdf.addImage(sliceData, 'PNG', margin, position, imgWidth, pageImgHeight, undefined, 'FAST');
          remaining -= pageImgHeight;
          offsetY += sliceHeightPx;
          if (remaining > 0) {
            pdf.addPage();
            position = margin;
          }
        }
      }
      const name = `${(header.shopName || 'ticket').replace(/[^a-z0-9-_]+/gi,'_')}-${meta.date}-${meta.ticketNumber || ''}.pdf`;
      pdf.save(name);
    } catch (e) {
      alert('❌ Export PDF impossible');
    }
  };
  const settings = useMemo(() => {
    try { return StorageService.loadSettings() || {}; } catch { return {}; }
  }, [open]);

  const defaults = (settings && settings.professionalReceiptDefaults) || {};

  const now = new Date();
  const [header, setHeader] = useState({
    shopName: defaults.shopName || '',
    address: defaults.address || '',
    phone: defaults.phone || '',
    email: defaults.email || '',
    website: defaults.website || '',
  });

  const [meta, setMeta] = useState({
    date: defaults.date || now.toISOString().slice(0, 10),
    time: defaults.time || now.toTimeString().slice(0, 5),
    ticketNumber: defaults.ticketNumber || '',
  });

  const [footer, setFooter] = useState({
    paymentMethod: defaults.paymentMethod || '',
    siret: defaults.siret || '',
    customNote: defaults.customNote || '',
  });

  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(
    Number.isFinite(Number(defaults.taxRateDefault)) ? Number(defaults.taxRateDefault) : 20
  );

  const [items, setItems] = useState<ReceiptItem[]>([
    { description: '', quantity: 1, unitPrice: 0, taxRate: Number.isFinite(Number(defaults.taxRateDefault)) ? Number(defaults.taxRateDefault) : 20 },
  ]);

  // Mode regroupement "Cadeaux entreprise"
  const [groupAsGift, setGroupAsGift] = useState<boolean>(Boolean(defaults.giftModeEnabled) || false);
  const [giftLabel, setGiftLabel] = useState<string>(defaults.giftLabel || 'Cadeaux entreprise');
  const [giftTaxRate, setGiftTaxRate] = useState<number>(
    Number.isFinite(Number(defaults.giftTaxRate)) ? Number(defaults.giftTaxRate) : (Number.isFinite(Number(defaults.taxRateDefault)) ? Number(defaults.taxRateDefault) : 20)
  );

  useEffect(() => {
    if (!open) return;
    try {
      const s = StorageService.loadSettings() || {};
      const d = (s && s.professionalReceiptDefaults) || {};
      setHeader({
        shopName: d.shopName || '',
        address: d.address || '',
        phone: d.phone || '',
        email: d.email || '',
        website: d.website || '',
      });
      const n = new Date();
      setMeta({
        date: d.date || n.toISOString().slice(0, 10),
        time: d.time || n.toTimeString().slice(0, 5),
        ticketNumber: d.ticketNumber || '',
      });
      setFooter({
        paymentMethod: d.paymentMethod || '',
        siret: d.siret || '',
        customNote: d.customNote || '',
      });
      setDefaultTaxRate(Number.isFinite(Number(d.taxRateDefault)) ? Number(d.taxRateDefault) : 20);
      setItems([{ description: '', quantity: 1, unitPrice: 0, taxRate: Number.isFinite(Number(d.taxRateDefault)) ? Number(d.taxRateDefault) : 20 }]);
      setGroupAsGift(Boolean(d.giftModeEnabled) || false);
      setGiftLabel(d.giftLabel || 'Cadeaux entreprise');
      setGiftTaxRate(Number.isFinite(Number(d.giftTaxRate)) ? Number(d.giftTaxRate) : (Number.isFinite(Number(d.taxRateDefault)) ? Number(d.taxRateDefault) : 20));
    } catch {}
  }, [open]);

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, taxRate: defaultTaxRate }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<ReceiptItem>) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const rawSubtotalTTC = useMemo(() => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0), [items]);

  const displayItems: ReceiptItem[] = useMemo(() => {
    if (!groupAsGift) return items;
    return [{ description: giftLabel || 'Cadeaux entreprise', quantity: 1, unitPrice: rawSubtotalTTC, taxRate: giftTaxRate }];
  }, [groupAsGift, giftLabel, giftTaxRate, items, rawSubtotalTTC]);

  const totals = useMemo(() => {
    let totalHT = 0;
    let totalTVA = 0;
    const byRate: Record<string, { baseHT: number; tva: number }> = {};
    displayItems.forEach(it => {
      const qty = Number(it.quantity) || 0;
      const puTTC = Number(it.unitPrice) || 0;
      const rate = Number(it.taxRate) || 0;
      const lineTTC = qty * puTTC;
      const lineHT = rate > 0 ? lineTTC / (1 + rate / 100) : lineTTC;
      const lineTVA = lineTTC - lineHT;
      totalHT += lineHT;
      totalTVA += lineTVA;
      const key = `${rate.toFixed(2)}%`;
      if (!byRate[key]) byRate[key] = { baseHT: 0, tva: 0 };
      byRate[key].baseHT += lineHT;
      byRate[key].tva += lineTVA;
    });
    return { totalHT, totalTVA, totalTTC: totalHT + totalTVA, byRate };
  }, [displayItems]);

  const handleSaveDefaults = () => {
    try {
      const s = StorageService.loadSettings() || {};
      const professionalReceiptDefaults = {
        ...header,
        ...meta,
        ...footer,
        taxRateDefault: defaultTaxRate,
        giftModeEnabled: groupAsGift,
        giftLabel: giftLabel,
        giftTaxRate: giftTaxRate,
      };
      StorageService.saveSettings({ ...s, professionalReceiptDefaults });
      alert('✅ En-tête/pied enregistrés comme défauts.');
    } catch {
      alert('❌ Impossible d\'enregistrer les défauts');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Ticket professionnel
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Styles impression */}
        <style>
          {`@media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .receipt-paper {
              box-shadow: none !important;
              border: 1px solid #000 !important;
              width: 80mm;
              margin: 0 auto;
              padding: 0;
            }
            body { background: white; }
          }
          .print-only { display: none; }`}
        </style>

        <Grid container spacing={2} className="no-print">
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>En-tête</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={6}><TextField label="Nom de la boutique" fullWidth size="small" value={header.shopName} onChange={e => setHeader({ ...header, shopName: e.target.value })} /></Grid>
              <Grid item xs={12} md={6}><TextField label="Téléphone" fullWidth size="small" value={header.phone} onChange={e => setHeader({ ...header, phone: e.target.value })} /></Grid>
              <Grid item xs={12} md={8}><TextField label="Adresse" fullWidth size="small" value={header.address} onChange={e => setHeader({ ...header, address: e.target.value })} /></Grid>
              <Grid item xs={12} md={4}><TextField label="Email" fullWidth size="small" value={header.email} onChange={e => setHeader({ ...header, email: e.target.value })} /></Grid>
              <Grid item xs={12} md={6}><TextField label="Site web" fullWidth size="small" value={header.website} onChange={e => setHeader({ ...header, website: e.target.value })} /></Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Informations</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={3}><TextField label="Date" type="date" fullWidth size="small" value={meta.date} onChange={e => setMeta({ ...meta, date: e.target.value })} /></Grid>
              <Grid item xs={12} md={3}><TextField label="Heure" type="time" fullWidth size="small" value={meta.time} onChange={e => setMeta({ ...meta, time: e.target.value })} /></Grid>
              <Grid item xs={12} md={6}><TextField label="Numéro de ticket" fullWidth size="small" value={meta.ticketNumber} onChange={e => setMeta({ ...meta, ticketNumber: e.target.value })} /></Grid>
              <Grid item xs={12} md={3}><TextField label="TVA par défaut (%)" type="number" inputProps={{ step: '0.1', min: '0' }} fullWidth size="small" value={defaultTaxRate} onChange={e => setDefaultTaxRate(parseFloat(e.target.value || '0'))} /></Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Switch checked={groupAsGift} onChange={(_, v) => setGroupAsGift(v)} />} label="Remplacer la liste par un seul article (Cadeaux entreprise)" />
              </Grid>
              {groupAsGift && (
                <>
                  <Grid item xs={12} md={6}><TextField label="Libellé regroupé" fullWidth size="small" value={giftLabel} onChange={e => setGiftLabel(e.target.value)} /></Grid>
                  <Grid item xs={12} md={3}><TextField label="TVA regroupée (%)" type="number" inputProps={{ step: '0.1', min: '0' }} fullWidth size="small" value={giftTaxRate} onChange={e => setGiftTaxRate(parseFloat(e.target.value || '0'))} /></Grid>
                </>
              )}
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Lignes du ticket</Typography>
            {!groupAsGift && items.map((it, idx) => (
              <Grid key={idx} container spacing={1} sx={{ mb: 0.5 }}>
                <Grid item xs={12} md={6}>
                  <TextField label="Désignation" fullWidth size="small" value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} />
                </Grid>
                <Grid item xs={4} md={2}>
                  <TextField label="Qté" type="number" inputProps={{ step: '1', min: '0' }} fullWidth size="small" value={it.quantity} onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value || '0') })} />
                </Grid>
                <Grid item xs={4} md={3}>
                  <TextField label="PU TTC (€)" type="number" inputProps={{ step: '0.01', min: '0' }} fullWidth size="small" value={it.unitPrice} onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value || '0') })} />
                </Grid>
                <Grid item xs={4} md={2}>
                  <TextField label="TVA (%)" type="number" inputProps={{ step: '0.1', min: '0' }} fullWidth size="small" value={it.taxRate} onChange={e => updateItem(idx, { taxRate: parseFloat(e.target.value || '0') })} />
                </Grid>
                <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <IconButton color="error" onClick={() => removeItem(idx)} aria-label="Supprimer"><Delete /></IconButton>
                </Grid>
              </Grid>
            ))}
            {!groupAsGift && (
              <Button startIcon={<Add />} onClick={addItem} size="small">Ajouter une ligne</Button>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Pied</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={4}><TextField label="Moyen de paiement" fullWidth size="small" value={footer.paymentMethod} onChange={e => setFooter({ ...footer, paymentMethod: e.target.value })} /></Grid>
              <Grid item xs={12} md={4}><TextField label="SIRET" fullWidth size="small" value={footer.siret} onChange={e => setFooter({ ...footer, siret: e.target.value })} /></Grid>
              <Grid item xs={12} md={4}><TextField label="Note pied de ticket" fullWidth size="small" value={footer.customNote} onChange={e => setFooter({ ...footer, customNote: e.target.value })} /></Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Aperçu imprimable */}
        <Box sx={{ mt: 2 }}>
          <Paper ref={receiptRef} elevation={3} sx={{ p: 2, maxWidth: 520, mx: 'auto', border: '2px solid #444', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} className="receipt-paper">
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', letterSpacing: 0.3 }}>{header.shopName || '—'}</Typography>
              {header.address && <Typography variant="body2">{header.address}</Typography>}
              {(header.phone || header.email) && (
                <Typography variant="body2">{[header.phone, header.email].filter(Boolean).join(' · ')}</Typography>
              )}
              {header.website && <Typography variant="body2">{header.website}</Typography>}
            </Box>
            <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', mb: 1 }}>
              <span>Date: {meta.date} {meta.time}</span>
              <span>Ticket: {meta.ticketNumber || '—'}</span>
            </Box>
            <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
            <Box>
              {displayItems.map((it, i) => (
                <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', columnGap: 8, rowGap: 0.25, mb: 0.75 }}>
                  <Typography variant="body2" sx={{ gridColumn: '1 / -1', fontWeight: 500 }}>{it.description || '—'}</Typography>
                  <Typography variant="caption">Qté {Number(it.quantity) || 0}</Typography>
                  <Typography variant="caption" sx={{ textAlign: 'right' }}>PU TTC {(Number(it.unitPrice) || 0).toFixed(2)}€</Typography>
                  <Typography variant="caption" sx={{ textAlign: 'right' }}>TVA {Number(it.taxRate || 0).toFixed(1)}%</Typography>
                  <Typography variant="caption" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{(((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))).toFixed(2)}€</Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
            {/* Récap TVA */}
            <Box sx={{ mb: 1 }}>
              {Object.entries(totals.byRate).map(([rate, v]) => (
                <Box key={rate} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', mb: 0.25 }}>
                  <Typography variant="caption">TVA {rate} — Base HT</Typography>
                  <Typography variant="caption" sx={{ textAlign: 'right', fontFamily: 'monospace' }}>{v.baseHT.toFixed(2)}€</Typography>
                  <Typography variant="caption">TVA {rate}</Typography>
                  <Typography variant="caption" sx={{ textAlign: 'right', fontFamily: 'monospace' }}>{v.tva.toFixed(2)}€</Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Total HT</Typography>
              <Typography variant="body2" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{totals.totalHT.toFixed(2)}€</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>TVA</Typography>
              <Typography variant="body2" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{totals.totalTVA.toFixed(2)}€</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>Total TTC</Typography>
              <Typography variant="body1" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{totals.totalTTC.toFixed(2)}€</Typography>
            </Box>
            <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
            <Box sx={{ textAlign: 'center', fontSize: '0.8rem' }}>
              {footer.paymentMethod && <Typography variant="body2">Paiement: {footer.paymentMethod}</Typography>}
              {footer.siret && <Typography variant="body2">SIRET: {footer.siret}</Typography>}
              {footer.customNote && <Typography variant="body2">{footer.customNote}</Typography>}
            </Box>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<Save />} onClick={handleSaveDefaults} className="no-print">Enregistrer défauts</Button>
        <Button startIcon={<Print />} variant="contained" onClick={handlePrint}>Imprimer</Button>
        <Button startIcon={<Download />} variant="outlined" onClick={exportPDF}>Exporter PDF</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProReceiptModal;


