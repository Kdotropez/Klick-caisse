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
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Close, Delete, Print, Save } from '@mui/icons-material';
import { StorageService } from '../../services/StorageService';

interface ProReceiptModalProps {
  open: boolean;
  onClose: () => void;
}

type ReceiptItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export const ProReceiptModal: React.FC<ProReceiptModalProps> = ({ open, onClose }) => {
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

  const [items, setItems] = useState<ReceiptItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

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
    } catch {}
  }, [open]);

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<ReceiptItem>) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const subtotal = useMemo(() => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0), [items]);

  const handleSaveDefaults = () => {
    try {
      const s = StorageService.loadSettings() || {};
      const professionalReceiptDefaults = {
        ...header,
        ...meta,
        ...footer,
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
              border: none !important;
              width: 80mm;
              margin: 0;
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
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Lignes du ticket</Typography>
            {items.map((it, idx) => (
              <Grid key={idx} container spacing={1} sx={{ mb: 0.5 }}>
                <Grid item xs={12} md={6}>
                  <TextField label="Désignation" fullWidth size="small" value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} />
                </Grid>
                <Grid item xs={4} md={2}>
                  <TextField label="Qté" type="number" inputProps={{ step: '1', min: '0' }} fullWidth size="small" value={it.quantity} onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value || '0') })} />
                </Grid>
                <Grid item xs={5} md={3}>
                  <TextField label="PU TTC (€)" type="number" inputProps={{ step: '0.01', min: '0' }} fullWidth size="small" value={it.unitPrice} onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value || '0') })} />
                </Grid>
                <Grid item xs={3} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <IconButton color="error" onClick={() => removeItem(idx)} aria-label="Supprimer"><Delete /></IconButton>
                </Grid>
              </Grid>
            ))}
            <Button startIcon={<Add />} onClick={addItem} size="small">Ajouter une ligne</Button>
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
          <Paper elevation={3} sx={{ p: 2, maxWidth: 480, mx: 'auto' }} className="receipt-paper">
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{header.shopName || '—'}</Typography>
              {header.address && <Typography variant="body2">{header.address}</Typography>}
              {(header.phone || header.email) && (
                <Typography variant="body2">{[header.phone, header.email].filter(Boolean).join(' · ')}</Typography>
              )}
              {header.website && <Typography variant="body2">{header.website}</Typography>}
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', mb: 1 }}>
              <span>Date: {meta.date} {meta.time}</span>
              <span>Ticket: {meta.ticketNumber || '—'}</span>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box>
              {items.map((it, i) => (
                <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 1, rowGap: 0.25, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ gridColumn: '1 / -1' }}>{it.description || '—'}</Typography>
                  <Typography variant="caption">Qté {Number(it.quantity) || 0}</Typography>
                  <Typography variant="caption" sx={{ textAlign: 'right' }}>{(Number(it.unitPrice) || 0).toFixed(2)}€</Typography>
                  <Typography variant="caption" sx={{ textAlign: 'right', fontWeight: 'bold' }}>{(((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))).toFixed(2)}€</Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Total TTC</span>
              <span>{subtotal.toFixed(2)}€</span>
            </Box>
            <Divider sx={{ my: 1 }} />
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
      </DialogActions>
    </Dialog>
  );
};

export default ProReceiptModal;


