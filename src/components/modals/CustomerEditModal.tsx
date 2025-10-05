import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import { Customer } from '../../types/Customer';

interface CustomerEditModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave: (customer: Customer) => void;
}

const CustomerEditModal: React.FC<CustomerEditModalProps> = ({ open, onClose, customer, onSave }) => {
  const [form, setForm] = useState<Customer | null>(customer);

  useEffect(() => { setForm(customer); }, [customer]);

  if (!form) return null;
  const canSave = form.lastName.trim().length > 0 && form.firstName.trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier client</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
          <TextField label="Nom" value={form.lastName} onChange={e=>setForm({ ...form, lastName: e.target.value })} required />
          <TextField label="Prénom" value={form.firstName} onChange={e=>setForm({ ...form, firstName: e.target.value })} required />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, mt: 1 }}>
          <TextField label="Adresse" value={form.address} onChange={e=>setForm({ ...form, address: e.target.value })} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mt: 1 }}>
          <TextField label="Code postal" value={form.postalCode} onChange={e=>setForm({ ...form, postalCode: e.target.value })} />
          <TextField label="Ville" value={form.city} onChange={e=>setForm({ ...form, city: e.target.value })} />
          <TextField label="Pays" value={form.country} onChange={e=>setForm({ ...form, country: e.target.value })} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
          <TextField label="Email" type="email" value={form.email} onChange={e=>setForm({ ...form, email: e.target.value })} />
          <TextField label="Téléphone" value={form.phone} onChange={e=>setForm({ ...form, phone: e.target.value })} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={() => canSave && onSave(form)} variant="contained" disabled={!canSave}>Enregistrer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerEditModal;


