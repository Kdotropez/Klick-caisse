import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import { Customer } from '../../types/Customer';

interface CustomerCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (customer: Omit<Customer,'id'|'createdAt'>) => void;
}

const CustomerCreateModal: React.FC<CustomerCreateModalProps> = ({ open, onClose, onCreate }) => {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('France');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const canSave = lastName.trim().length > 0 && firstName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onCreate({ lastName: lastName.trim(), firstName: firstName.trim(), address, postalCode, city, country, email, phone } as any);
    onClose();
    setLastName(''); setFirstName(''); setAddress(''); setPostalCode(''); setCity(''); setCountry('France'); setEmail(''); setPhone('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nouveau client</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
          <TextField label="Nom" value={lastName} onChange={e=>setLastName(e.target.value)} required />
          <TextField label="Prénom" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, mt: 1 }}>
          <TextField label="Adresse" value={address} onChange={e=>setAddress(e.target.value)} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mt: 1 }}>
          <TextField label="Code postal" value={postalCode} onChange={e=>setPostalCode(e.target.value)} />
          <TextField label="Ville" value={city} onChange={e=>setCity(e.target.value)} />
          <TextField label="Pays" value={country} onChange={e=>setCountry(e.target.value)} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
          <TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <TextField label="Téléphone" value={phone} onChange={e=>setPhone(e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} variant="contained" disabled={!canSave}>Enregistrer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerCreateModal;


