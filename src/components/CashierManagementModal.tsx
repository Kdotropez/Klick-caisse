import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { Cashier } from '../types/Cashier';

interface CashierManagementModalProps {
  open: boolean;
  onClose: () => void;
  cashiers: Cashier[];
  onUpdateCashiers: (cashiers: Cashier[]) => void;
}

const CashierManagementModal: React.FC<CashierManagementModalProps> = ({
  open,
  onClose,
  cashiers,
  onUpdateCashiers
}) => {
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    pin: '',
    isActive: true
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setEditingCashier(null);
    setIsAdding(false);
    setFormData({
      name: '',
      firstName: '',
      pin: '',
      isActive: true
    });
    setError('');
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingCashier(null);
    setFormData({
      name: '',
      firstName: '',
      pin: '',
      isActive: true
    });
  };

  const handleEdit = (cashier: Cashier) => {
    setEditingCashier(cashier);
    setIsAdding(false);
    setFormData({
      name: cashier.name,
      firstName: cashier.firstName,
      pin: '', // Ne pas afficher le PIN existant
      isActive: cashier.isActive
    });
  };

  const handleDelete = (cashierId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`Supprimer le caissier "${cashiers.find(c => c.id === cashierId)?.firstName} ${cashiers.find(c => c.id === cashierId)?.name}" ?`)) {
      const updatedCashiers = cashiers.filter(c => c.id !== cashierId);
      onUpdateCashiers(updatedCashiers);
    }
  };

  const handleSave = () => {
    // Validation
    if (!formData.name.trim() || !formData.firstName.trim()) {
      setError('Le nom et prénom sont obligatoires');
      return;
    }

    if (isAdding && formData.pin.length !== 4) {
      setError('Le code PIN doit contenir 4 chiffres');
      return;
    }

    if (isAdding && !/^\d{4}$/.test(formData.pin)) {
      setError('Le code PIN doit contenir uniquement des chiffres');
      return;
    }

    // Vérifier si le nom existe déjà (sauf pour l'édition)
    if (isAdding && cashiers.some(c => 
      c.name.toLowerCase() === formData.name.toLowerCase() && 
      c.firstName.toLowerCase() === formData.firstName.toLowerCase()
    )) {
      setError('Un caissier avec ce nom existe déjà');
      return;
    }

    if (isAdding) {
      // Ajouter un nouveau caissier
      const newCashier: Cashier = {
        id: `cashier_${Date.now()}`,
        name: formData.name.trim(),
        firstName: formData.firstName.trim(),
        pin: formData.pin,
        isActive: formData.isActive,
        createdAt: new Date(),
        totalSales: 0,
        totalTransactions: 0
      };
      onUpdateCashiers([...cashiers, newCashier]);
    } else if (editingCashier) {
      // Modifier un caissier existant
      const updatedCashiers = cashiers.map(c => {
        if (c.id === editingCashier.id) {
          return {
            ...c,
            name: formData.name.trim(),
            firstName: formData.firstName.trim(),
            isActive: formData.isActive,
            ...(formData.pin && { pin: formData.pin }) // Mettre à jour le PIN seulement s'il est fourni
          };
        }
        return c;
      });
      onUpdateCashiers(updatedCashiers);
    }

    resetForm();
  };

  const handleCancel = () => {
    resetForm();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        👥 Gestion des Caissiers
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={handleAdd}
          size="small"
        >
          Ajouter
        </Button>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2}>
          {/* Formulaire */}
          {(isAdding || editingCashier) && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {isAdding ? 'Nouveau Caissier' : 'Modifier Caissier'}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Prénom"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Nom"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Code PIN"
                      type="password"
                      value={formData.pin}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 4 && /^\d*$/.test(value)) {
                          setFormData({ ...formData, pin: value });
                        }
                      }}
                      placeholder={editingCashier ? "Laisser vide pour ne pas changer" : "••••"}
                      size="small"
                      inputProps={{ maxLength: 4 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                      }
                      label="Actif"
                    />
                  </Grid>
                </Grid>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button onClick={handleCancel} color="inherit">
                    Annuler
                  </Button>
                  <Button onClick={handleSave} variant="contained">
                    {isAdding ? 'Ajouter' : 'Modifier'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          )}

          {/* Liste des caissiers */}
          <Grid item xs={12}>
            <List>
              {cashiers.map((cashier, index) => (
                <React.Fragment key={cashier.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {cashier.firstName} {cashier.name}
                          </Typography>
                          {!cashier.isActive && (
                            <Chip label="Inactif" size="small" color="error" />
                          )}
                          {cashier.lastLogin && (
                            <Chip 
                              label={`Dernière connexion: ${formatDate(cashier.lastLogin)}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Créé le {formatDate(cashier.createdAt)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total ventes: {cashier.totalSales.toFixed(2)}€ • Transactions: {cashier.totalTransactions}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          edge="end"
                          onClick={() => handleEdit(cashier)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDelete(cashier.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < cashiers.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CashierManagementModal;
