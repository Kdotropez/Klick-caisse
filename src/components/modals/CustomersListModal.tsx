import React, { useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, List, ListItem, Box, Typography, IconButton } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { Customer } from '../../types/Customer';

interface CustomersListModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onEdit?: (customer: Customer) => void;
}

const CustomersListModal: React.FC<CustomersListModalProps> = ({ open, onClose, customers, onEdit }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(c =>
      `${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${c.address} ${c.postalCode} ${c.city} ${c.country}`
        .toLowerCase()
        .includes(needle)
    );
  }, [q, customers]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Clients enregistrés</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Rechercher" value={q} onChange={(e)=>setQ(e.target.value)} sx={{ mb: 2 }} />
        <List dense>
          {filtered.map(c => (
            <ListItem key={c.id} sx={{ py: 0.5, borderBottom: '1px solid #eee' }}
              secondaryAction={
                onEdit ? (
                  <IconButton edge="end" aria-label="edit" onClick={() => onEdit(c)}>
                    <Edit />
                  </IconButton>
                ) : undefined
              }
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{c.lastName} {c.firstName}</Typography>
                <Typography variant="body2">{c.email}</Typography>
                <Typography variant="body2">{c.phone}</Typography>
                <Typography variant="body2">{c.postalCode} {c.city}</Typography>
              </Box>
            </ListItem>
          ))}
          {filtered.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Aucun client</Box>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomersListModal;


