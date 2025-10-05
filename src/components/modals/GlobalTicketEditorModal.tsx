import React, { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText, Typography, TextField } from '@mui/material';
import { Add, Remove, Edit } from '@mui/icons-material';
import { StorageService } from '../../services/StorageService';
import CustomersListModal from './CustomersListModal';

interface GlobalTicketEditorModalProps {
  open: boolean;
  onClose: () => void;
  isToday: boolean;
  draft: any | null;
  setDraft: (updater: (prev: any) => any) => void;
  refreshToday: () => void;
}

const GlobalTicketEditorModal: React.FC<GlobalTicketEditorModalProps> = ({ open, onClose, isToday, draft, setDraft, refreshToday }) => {
  // Debug: afficher les informations du draft
  console.log('GlobalTicketEditorModal - draft:', draft);
  console.log('GlobalTicketEditorModal - paymentMethod:', draft?.paymentMethod);
  
  // État pour la modification des prix
  const [editingPrice, setEditingPrice] = useState<{ itemIndex: number; newPrice: string } | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  
  const recalcAndSave = () => {
    if (!draft) return;
    const total = (draft.items || []).reduce((s:number, it:any) => {
      const up = getDisplayPrice(it); // Utiliser le prix personnalisé s'il existe
      return s + (up * (it.quantity||0));
    }, 0);
    const updated = { ...draft, total };
    if (isToday) {
      StorageService.updateDailyTransaction(updated);
      refreshToday();
    } else {
      const closures = StorageService.loadClosures();
      const newClosures = closures.map(c => {
        const arr = Array.isArray(c.transactions) ? c.transactions : [];
        const idx = arr.findIndex((t:any) => String(t.id) === String(updated.id));
        if (idx >= 0) {
          const copy = [...arr];
          copy[idx] = updated;
          return { ...c, transactions: copy };
        }
        return c;
      });
      StorageService.saveAllClosures(newClosures);
    }
    onClose();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return '💵 Espèces';
      case 'card': return '💳 Carte';
      case 'check': return '📝 Chèque';
      case 'sumup': return '📱 SumUp';
      default: return method;
    }
  };

  // Fonction pour démarrer l'édition du prix
  const startPriceEdit = (itemIndex: number, currentPrice: number) => {
    setEditingPrice({ itemIndex, newPrice: currentPrice.toFixed(2) });
  };

  // Fonction pour sauvegarder le nouveau prix
  const savePriceEdit = () => {
    if (!editingPrice || !draft) return;
    
    // Accepte la virgule comme séparateur décimal
    const normalized = String(editingPrice.newPrice).replace(',', '.');
    const newPrice = parseFloat(normalized);
    if (isNaN(newPrice) || newPrice < 0) {
      alert('❌ Prix invalide. Veuillez entrer un nombre positif.');
      return;
    }

    setDraft((prev: any) => {
      const updatedItems = [...prev.items];
      const item = updatedItems[editingPrice.itemIndex];
      
      // Créer une copie de l'article avec le nouveau prix
      const updatedItem = {
        ...item,
        customPrice: newPrice, // Marquer comme prix personnalisé
        originalPrice: item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice // Sauvegarder le prix original
      };
      
      updatedItems[editingPrice.itemIndex] = updatedItem;
      // Recalcul immédiat du total pour retour visuel
      const newTotal = (updatedItems || []).reduce((s:number, it:any) => {
        const unit = it.customPrice !== undefined
          ? it.customPrice
          : (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice);
        return s + (unit * (it.quantity || 0));
      }, 0);
      return { ...prev, items: updatedItems, total: newTotal };
    });
    
    setEditingPrice(null);
  };

  // Fonction pour annuler l'édition du prix
  const cancelPriceEdit = () => {
    setEditingPrice(null);
  };

  // Fonction pour obtenir le prix affiché d'un article
  const getDisplayPrice = (item: any) => {
    if (item.customPrice !== undefined) {
      return item.customPrice;
    }
    return item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier ticket</DialogTitle>
      <DialogContent>
        {draft && (
          <Box>
            {/* Client associé */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 0 }}>Client</Typography>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: draft.customerName ? 'primary.main' : 'text.secondary' }}>
                  {draft.customerName || 'Aucun'}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setShowCustomerPicker(true)}>Associer</Button>
                {draft.customerId && (
                  <Button size="small" color="error" onClick={() => setDraft((prev:any)=> ({ ...prev, customerId: undefined, customerName: undefined }))}>Effacer</Button>
                )}
              </Box>
            </Box>

            {/* Sélection du mode de règlement */}
            <Typography variant="h6" sx={{ mb: 1 }}>Mode de règlement</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
              <Button
                variant={draft.paymentMethod === 'cash' ? 'contained' : 'outlined'}
                color={draft.paymentMethod === 'cash' ? 'success' : 'primary'}
                onClick={() => setDraft((prev: any) => ({ ...prev, paymentMethod: 'cash' }))}
                sx={{ py: 1.5, fontSize: '0.9rem' }}
              >
                💵 Espèces
              </Button>
              <Button
                variant={draft.paymentMethod === 'card' ? 'contained' : 'outlined'}
                color={draft.paymentMethod === 'card' ? 'primary' : 'primary'}
                onClick={() => setDraft((prev: any) => ({ ...prev, paymentMethod: 'card' }))}
                sx={{ py: 1.5, fontSize: '0.9rem' }}
              >
                💳 Carte
              </Button>
              <Button
                variant={draft.paymentMethod === 'check' ? 'contained' : 'outlined'}
                color={draft.paymentMethod === 'check' ? 'warning' : 'primary'}
                onClick={() => setDraft((prev: any) => ({ ...prev, paymentMethod: 'check' }))}
                sx={{ py: 1.5, fontSize: '0.9rem' }}
              >
                📝 Chèque
              </Button>
              <Button
                variant={draft.paymentMethod === 'sumup' ? 'contained' : 'outlined'}
                color={draft.paymentMethod === 'sumup' ? 'secondary' : 'primary'}
                onClick={() => setDraft((prev: any) => ({ ...prev, paymentMethod: 'sumup' }))}
                sx={{ py: 1.5, fontSize: '0.9rem' }}
              >
                📱 SumUp
              </Button>
            </Box>

            {/* Liste des articles */}
            <Typography variant="h6" sx={{ mb: 1 }}>Articles du ticket</Typography>
            <List dense>
              {draft.items.map((it: any, idx: number) => {
                const unitPrice = getDisplayPrice(it);
                const isEditing = editingPrice?.itemIndex === idx;
                
                return (
                  <ListItem key={`${it.product.id}-${it.selectedVariation?.id || 'main'}-${idx}`} sx={{ py: 0.25 }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => setDraft((prev: any) => {
                          const newItems = prev.items.map((x:any,i:number)=> i===idx ? { ...x, quantity: Math.max(0, (x.quantity||0)-1) } : x);
                          const newTotal = (newItems || []).reduce((s:number, it:any) => {
                            const unit = it.customPrice !== undefined
                              ? it.customPrice
                              : (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice);
                            return s + (unit * (it.quantity || 0));
                          }, 0);
                          return { ...prev, items: newItems, total: newTotal };
                        })}><Remove fontSize="small" /></IconButton>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 20, textAlign: 'center' }}>{it.quantity}</Typography>
                        <IconButton size="small" onClick={() => setDraft((prev: any) => {
                          const newItems = prev.items.map((x:any,i:number)=> i===idx ? { ...x, quantity: (x.quantity||0)+1 } : x);
                          const newTotal = (newItems || []).reduce((s:number, it:any) => {
                            const unit = it.customPrice !== undefined
                              ? it.customPrice
                              : (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice);
                            return s + (unit * (it.quantity || 0));
                          }, 0);
                          return { ...prev, items: newItems, total: newTotal };
                        })}><Add fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDraft((prev:any) => {
                          const newItems = prev.items.filter((_:any,i:number)=> i!==idx);
                          const newTotal = (newItems || []).reduce((s:number, it:any) => {
                            const unit = it.customPrice !== undefined
                              ? it.customPrice
                              : (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice);
                            return s + (unit * (it.quantity || 0));
                          }, 0);
                          return { ...prev, items: newItems, total: newTotal };
                        })}>✕</IconButton>
                      </Box>
                    }
                  >
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{it.product.name}</Typography>
                          {it.customPrice !== undefined && (
                            <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                              (Prix modifié)
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        isEditing ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <TextField
                              size="small"
                              type="text"
                              value={editingPrice.newPrice}
                              onChange={(e) => setEditingPrice({ ...editingPrice, newPrice: e.target.value })}
                              placeholder="0,00"
                              sx={{ width: 80 }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); savePriceEdit(); }
                                if (e.key === 'Escape') { e.preventDefault(); cancelPriceEdit(); }
                              }}
                            />
                            <Typography variant="caption">€</Typography>
                            <Button size="small" variant="contained" color="primary" onClick={savePriceEdit}>
                              ✓
                            </Button>
                            <Button size="small" variant="outlined" onClick={cancelPriceEdit}>
                              ✕
                            </Button>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {it.quantity} x 
                            </Typography>
                            <Typography 
                              variant="body2" 
                              onClick={() => startPriceEdit(idx, unitPrice)}
                              sx={{ 
                                cursor: 'pointer', 
                                color: 'primary.main',
                                textDecoration: 'underline',
                                '&:hover': { backgroundColor: 'action.hover' },
                                px: 0.5,
                                borderRadius: 0.5
                              }}
                            >
                              {unitPrice.toFixed(2)} €
                            </Typography>
                            <Typography variant="body2">
                              = {(it.quantity * unitPrice).toFixed(2)} €
                            </Typography>
                            {!isEditing && (
                              <IconButton 
                                size="small" 
                                onClick={() => startPriceEdit(idx, unitPrice)}
                                sx={{ ml: 0.5 }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        )
                      }
                    />
                  </ListItem>
                );
              })}
              {draft.items.length===0 && (
                <ListItem><ListItemText primary="Ticket vide" /></ListItem>
              )}
            </List>

            {/* Total du ticket (recalculé en direct) */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="h6" align="right">
                {(() => {
                  const liveTotal = (draft.items || []).reduce((s:number, it:any) => {
                    const unit = it.customPrice !== undefined
                      ? it.customPrice
                      : (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice);
                    return s + (unit * (it.quantity || 0));
                  }, 0);
                  return `Total: ${liveTotal.toFixed(2)} €`;
                })()}
              </Typography>
              <Typography variant="body2" align="right" color="text.secondary">
                Mode de règlement: {getPaymentMethodLabel(draft.paymentMethod || 'cash')}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={recalcAndSave}>Enregistrer</Button>
      </DialogActions>
      {/* Sélecteur client */}
      <CustomersListModal
        open={showCustomerPicker}
        onClose={() => setShowCustomerPicker(false)}
        customers={(() => {
          try { return StorageService.loadCustomers(); } catch { return []; }
        })()}
        onPick={(c:any) => {
          setDraft((prev:any) => ({ ...prev, customerId: c.id, customerName: `${c.lastName} ${c.firstName}` }));
          setShowCustomerPicker(false);
        }}
        onEdit={undefined}
      />
    </Dialog>
  );
};

export default GlobalTicketEditorModal;



