import React, { useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, IconButton, TextField, Box } from '@mui/material';
import { Delete, Edit, Print, Download } from '@mui/icons-material';
import { ProReceiptStorage, ProReceipt } from '../../services/StorageService';

interface ProReceiptsManagerModalProps {
  open: boolean;
  onClose: () => void;
  onOpenEditor: (rec: ProReceipt) => void;
}

const ProReceiptsManagerModal: React.FC<ProReceiptsManagerModalProps> = ({ open, onClose, onOpenEditor }) => {
  const [search, setSearch] = useState('');
  const list = useMemo(() => ProReceiptStorage.loadProReceipts(), [open]);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter(r =>
      r.header?.shopName?.toLowerCase().includes(s) ||
      r.meta?.ticketNumber?.toLowerCase().includes(s) ||
      r.footer?.siret?.toLowerCase().includes(s)
    );
  }, [list, search]);

  const handleDelete = (id: string) => {
    if (!window.confirm('Supprimer ce ticket pro ?')) return;
    ProReceiptStorage.deleteProReceipt(id);
    // force refresh via petit hack: fermer puis rouvrir par parent, ou simple alert pour prévenir
    alert('✅ Ticket supprimé. Rouvrez la fenêtre pour rafraîchir la liste.');
  };

  const exportOne = (rec: ProReceipt) => {
    const data = JSON.stringify(rec, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-pro-${rec.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Tickets Pro enregistrés</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
          <TextField placeholder="Rechercher (boutique, n° ticket, SIRET)" fullWidth size="small" value={search} onChange={e => setSearch(e.target.value)} />
        </Box>
        <List>
          {filtered.map((rec) => (
            <ListItem key={rec.id} secondaryAction={
              <>
                <IconButton onClick={() => onOpenEditor(rec)} aria-label="éditer"><Edit /></IconButton>
                <IconButton onClick={() => exportOne(rec)} aria-label="export"><Download /></IconButton>
                <IconButton onClick={() => handleDelete(rec.id)} aria-label="supprimer" color="error"><Delete /></IconButton>
              </>
            }>
              <ListItemText
                primary={`${rec.meta?.date || ''} ${rec.meta?.time || ''} — Ticket ${rec.meta?.ticketNumber || '—'}`}
                secondary={`${rec.header?.shopName || ''} · SIRET ${rec.footer?.siret || ''}`}
              />
            </ListItem>
          ))}
          {filtered.length === 0 && (
            <ListItem>
              <ListItemText primary="Aucun ticket pro" />
            </ListItem>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProReceiptsManagerModal;


