import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { CartItem } from '../types/Product';
import { StorageService } from '../services/StorageService';

interface GlobalDiscountModalProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onApplyDiscount: (discountType: 'euro' | 'percent', value: number) => void;
  onApplyItemDiscount?: (itemId: string, variationId: string | null, discountType: 'euro' | 'percent' | 'price', value: number) => void;
  onRemoveItemDiscount?: (itemId: string, variationId: string | null) => void;
}

interface DiscountItem {
  id: string;
  type: 'euro' | 'percent';
  value: number;
  label: string;
  description: string;
}

const GlobalDiscountModal: React.FC<GlobalDiscountModalProps> = ({
  open,
  onClose,
  cartItems,
  onApplyDiscount,
  onApplyItemDiscount,
  onRemoveItemDiscount,
}) => {
  const [selectedDiscount, setSelectedDiscount] = useState<{type: 'euro' | 'percent', value: number} | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountItem | null>(null);
  const [newDiscount, setNewDiscount] = useState({ 
    type: 'percent' as 'euro' | 'percent', 
    value: 5, 
    label: '', 
    description: '' 
  });
  const [newTotalTicket, setNewTotalTicket] = useState<number>(0);
  const [promoMode, setPromoMode] = useState<'unit'|'total'>('unit');
  const [hideEasyclickPromo, setHideEasyclickPromo] = useState<boolean>(() => localStorage.getItem('hide_easyclickchic_promo') === '1');

  const [predefinedDiscounts, setPredefinedDiscounts] = useState<DiscountItem[]>(() => {
    const saved = localStorage.getItem('predefinedDiscounts');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: '1', type: 'percent', value: 5, label: '5%', description: 'Remise 5%' },
      { id: '2', type: 'percent', value: 10, label: '10%', description: 'Remise 10%' },
      { id: '3', type: 'percent', value: 15, label: '15%', description: 'Remise 15%' },
      { id: '4', type: 'percent', value: 20, label: '20%', description: 'Remise 20%' },
      { id: '5', type: 'euro', value: 5, label: '5€', description: 'Remise 5€' },
      { id: '6', type: 'euro', value: 10, label: '10€', description: 'Remise 10€' },
      { id: '7', type: 'euro', value: 15, label: '15€', description: 'Remise 15€' },
      { id: '8', type: 'euro', value: 20, label: '20€', description: 'Remise 20€' },
    ];
  });

  const saveDiscounts = (discounts: DiscountItem[]) => {
    setPredefinedDiscounts(discounts);
    localStorage.setItem('predefinedDiscounts', JSON.stringify(discounts));
  };

  const handleApply = () => {
    if (selectedDiscount) {
      onApplyDiscount(selectedDiscount.type, selectedDiscount.value);
      onClose();
      setSelectedDiscount(null);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedDiscount(null);
    setIsEditMode(false);
    setEditingDiscount(null);
  };

  const addDiscount = () => {
    if (newDiscount.label && newDiscount.description && newDiscount.value > 0) {
      const newId = Date.now().toString();
      const discountToAdd: DiscountItem = { ...newDiscount, id: newId };
      const updatedDiscounts = [...predefinedDiscounts, discountToAdd];
      saveDiscounts(updatedDiscounts);
      setNewDiscount({ type: 'percent', value: 5, label: '', description: '' });
    }
  };

  const editDiscount = (discount: DiscountItem) => {
    setEditingDiscount(discount);
  };

  const saveEdit = () => {
    if (editingDiscount && editingDiscount.label && editingDiscount.description && editingDiscount.value > 0) {
      const updatedDiscounts = predefinedDiscounts.map((d: DiscountItem) =>
        d.id === editingDiscount.id ? editingDiscount : d
      );
      saveDiscounts(updatedDiscounts);
      setEditingDiscount(null);
    }
  };

  const deleteDiscount = (id: string) => {
    const updatedDiscounts = predefinedDiscounts.filter((d: DiscountItem) => d.id !== id);
    saveDiscounts(updatedDiscounts);
  };

  const cancelEdit = () => {
    setEditingDiscount(null);
  };

  const calculateOriginalTotal = () => {
    const settings = StorageService.loadSettings() || ({} as any);
    const norm = (s: string) => StorageService.normalizeLabel(String(s||''));
    const excludedCats = new Set((Array.isArray(settings.excludedDiscountCategories)?settings.excludedDiscountCategories:[]).map(norm));
    const excludedSub = new Set((Array.isArray(settings.excludedDiscountSubcategories)?settings.excludedDiscountSubcategories:[]).map(norm));
    const excludedProd: string[] = Array.isArray(settings.excludedDiscountProductIds) ? settings.excludedDiscountProductIds : [];
    const isExcluded = (it: CartItem) => {
      if (excludedProd.includes(it.product.id)) return true;
      const cat = it.product?.category || '';
      if (excludedCats.has(norm(cat))) return true;
      const subs: string[] = Array.isArray((it.product as any)?.associatedCategories) ? (it.product as any).associatedCategories : [];
      return subs.some(s => excludedSub.has(norm(s)));
    };
    return cartItems.reduce((sum, it) => {
      if (isExcluded(it)) return sum; // exclure de la base de remise globale
      const price = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
      return sum + (price * it.quantity);
    }, 0);
  };

  const calculateDiscountedTotal = (discountType: 'euro' | 'percent', value: number) => {
    const originalTotal = calculateOriginalTotal();

    switch (discountType) {
      case 'euro':
        return Math.max(0, originalTotal - value);
      case 'percent':
        return originalTotal * (1 - value / 100);
      default:
        return originalTotal;
    }
  };

  const originalTotal = calculateOriginalTotal();

  // Résumé exclusions (catégories/sous-catégories/produits)
  const excludedSummary = useMemo(() => {
    const settings = StorageService.loadSettings() || ({} as any);
    const excludedCats: string[] = Array.isArray(settings.excludedDiscountCategories) ? settings.excludedDiscountCategories : [];
    const excludedSub: string[] = Array.isArray(settings.excludedDiscountSubcategories) ? settings.excludedDiscountSubcategories : [];
    const excludedProd: string[] = Array.isArray(settings.excludedDiscountProductIds) ? settings.excludedDiscountProductIds : [];
    let count = 0;
    let amount = 0;
    for (const it of cartItems) {
      const isProd = excludedProd.includes(it.product.id);
      const isCat = excludedCats.includes(it.product?.category || '');
      const subs: string[] = Array.isArray((it.product as any)?.associatedCategories) ? (it.product as any).associatedCategories : [];
      const isSub = subs.some(s => excludedSub.includes(s));
      if (isProd || isCat || isSub) {
        count += it.quantity || 0;
        const price = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
        amount += (price * (it.quantity || 0));
      }
    }
    return { count, amount };
  }, [cartItems]);

  // Promotions proposées (manuel): 6 easyclickchic, -1€ par article
  const easyclickPromo = useMemo(() => {
    const target = StorageService.normalizeLabel('easyclickchic');
    let totalQty = 0;
    for (const it of cartItems) {
      const list = Array.isArray(it.product.associatedCategories) ? it.product.associatedCategories : [];
      const has = list.some((c) => StorageService.normalizeLabel(String(c)).includes(target));
      if (has) totalQty += (it.quantity || 0);
    }
    return { eligible: totalQty >= 6, totalQty };
  }, [cartItems]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{
        backgroundColor: '#ff9800',
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>💰 Remises préprogrammées - Total: {originalTotal.toFixed(2)} €</span>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setIsEditMode(!isEditMode)}
          sx={{
            color: 'white',
            borderColor: 'white',
            '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
          }}
        >
          {isEditMode ? 'Fermer' : 'Modifier'}
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {excludedSummary.count > 0 && (
          <Paper sx={{ p: 1, mb: 2, backgroundColor: '#fffde7', border: '1px solid #ffe082' }}>
            <Typography variant="caption" sx={{ color: '#757575' }}>
              {excludedSummary.count} article{excludedSummary.count>1?'s':''} exclus non impactés ({excludedSummary.amount.toFixed(2)} €)
            </Typography>
          </Paper>
        )}
        {/* Promotions proposées (appliquer manuellement) */}
        {!hideEasyclickPromo && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#fffef5', border: '1px solid #ffe082' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Promotions proposées</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1, mr: 1 }}>
              <Button size="small" variant={promoMode==='unit'?'contained':'outlined'} onClick={()=>setPromoMode('unit')}>Par unité</Button>
              <Button size="small" variant={promoMode==='total'?'contained':'outlined'} onClick={()=>setPromoMode('total')}>Par total</Button>
            </Box>
            <Button
              variant={easyclickPromo.eligible ? 'contained' : 'outlined'}
              color={easyclickPromo.eligible ? 'warning' : 'inherit'}
              disabled={!easyclickPromo.eligible || !onApplyItemDiscount}
              onClick={() => {
                if (!onApplyItemDiscount) return;
                const target = StorageService.normalizeLabel('easyclickchic');
                let totalQty = 0;
                for (const it of cartItems) {
                  const list = Array.isArray(it.product.associatedCategories) ? it.product.associatedCategories : [];
                  const has = list.some((c) => StorageService.normalizeLabel(String(c)).includes(target));
                  if (!has) continue;
                  totalQty += (it.quantity||0);
                }
                const totalDiscount = totalQty * 1; // 1€ par article éligible
                for (const it of cartItems) {
                  const list = Array.isArray(it.product.associatedCategories) ? it.product.associatedCategories : [];
                  const has = list.some((c) => StorageService.normalizeLabel(String(c)).includes(target));
                  if (!has) continue;
                  const perUnit = promoMode==='unit' ? 1 : (totalQty>0 ? totalDiscount/totalQty : 0);
                  if (perUnit > 0) onApplyItemDiscount(it.product.id, it.selectedVariation?.id || null, 'euro', perUnit);
                }
              }}
            >
              6 EASYCLICKCHIC → −1€ / article {easyclickPromo.eligible ? `(${easyclickPromo.totalQty})` : ''}
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!onRemoveItemDiscount}
              onClick={() => {
                if (!onRemoveItemDiscount) return;
                const target = StorageService.normalizeLabel('easyclickchic');
                for (const it of cartItems) {
                  const list = Array.isArray(it.product.associatedCategories) ? it.product.associatedCategories : [];
                  const has = list.some((c) => StorageService.normalizeLabel(String(c)).includes(target));
                  if (!has) continue;
                  onRemoveItemDiscount(it.product.id, it.selectedVariation?.id || null);
                }
              }}
            >
              Retirer promo EASYCLICKCHIC
            </Button>
            <Button
              variant="text"
              size="small"
              sx={{ color: '#d32f2f' }}
              onClick={() => { localStorage.setItem('hide_easyclickchic_promo','1'); setHideEasyclickPromo(true); }}
            >
              Supprimer cette promo de la modale
            </Button>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            Ces remises ne s'appliquent que si vous cliquez dessus; aucune application automatique.
          </Typography>
        </Paper>
        )}
        {/* Fixer directement le total du ticket */}
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f9f9ff', border: '1px solid #bbdefb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Fixer le total du ticket</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField size="small" type="number" value={newTotalTicket}
              onChange={(e)=>setNewTotalTicket(parseFloat(e.target.value)||0)}
              inputProps={{ min: 0, step: 0.01 }} sx={{ width: 140 }} placeholder="Nouveau total (€)" />
            <Button variant="contained" size="small" disabled={newTotalTicket<=0}
              onClick={()=>{
                const delta = Math.max(0, originalTotal - newTotalTicket);
                onApplyDiscount('euro', delta);
                onClose();
              }}>Appliquer</Button>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Total actuel: {originalTotal.toFixed(2)} €
            </Typography>
          </Box>
        </Paper>
        {!isEditMode && (
          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
            Sélectionnez une remise à appliquer sur l'ensemble du ticket
          </Typography>
        )}

        {isEditMode && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Ajouter une nouvelle remise
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newDiscount.type}
                  onChange={(e) => setNewDiscount({...newDiscount, type: e.target.value as 'euro' | 'percent'})}
                  label="Type"
                >
                  <MenuItem value="percent">Pourcentage (%)</MenuItem>
                  <MenuItem value="euro">Euros (€)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                type="number"
                value={newDiscount.value}
                onChange={(e) => setNewDiscount({...newDiscount, value: parseFloat(e.target.value) || 0})}
                placeholder="Valeur"
                sx={{ width: 80 }}
              />
              <TextField
                size="small"
                value={newDiscount.label}
                onChange={(e) => setNewDiscount({...newDiscount, label: e.target.value})}
                placeholder="Label (ex: 5%)"
                sx={{ width: 100 }}
              />
              <TextField
                size="small"
                value={newDiscount.description}
                onChange={(e) => setNewDiscount({...newDiscount, description: e.target.value})}
                placeholder="Description"
                sx={{ width: 150 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={addDiscount}
                disabled={!newDiscount.label || !newDiscount.description || newDiscount.value <= 0}
                sx={{ backgroundColor: '#4caf50' }}
              >
                Ajouter
              </Button>
            </Box>
          </Paper>
        )}

                 <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
           {predefinedDiscounts.map((discount: DiscountItem, index: number) => {
             const discountedTotal = calculateDiscountedTotal(discount.type, discount.value);
             const discountAmount = originalTotal - discountedTotal;
             const isEditing = editingDiscount?.id === discount.id;

             return (
               <Box key={discount.id}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: isEditMode ? 'default' : 'pointer',
                    border: selectedDiscount?.type === discount.type && selectedDiscount?.value === discount.value
                      ? '2px solid #ff9800'
                      : '1px solid #e0e0e0',
                    backgroundColor: selectedDiscount?.type === discount.type && selectedDiscount?.value === discount.value
                      ? '#fff3e0'
                      : 'white',
                    '&:hover': {
                      backgroundColor: isEditMode ? 'white' : '#fff3e0',
                      borderColor: isEditMode ? '#e0e0e0' : '#ff9800'
                    }
                  }}
                  onClick={() => !isEditMode && setSelectedDiscount({ type: discount.type, value: discount.value })}
                >
                  {isEditing && editingDiscount ? (
                    <Box sx={{ textAlign: 'left' }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 60 }}>
                          <Select
                            value={editingDiscount.type}
                            onChange={(e) => setEditingDiscount({...editingDiscount, type: e.target.value as 'euro' | 'percent'})}
                            size="small"
                          >
                            <MenuItem value="percent">%</MenuItem>
                            <MenuItem value="euro">€</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          size="small"
                          type="number"
                          value={editingDiscount.value}
                          onChange={(e) => setEditingDiscount({...editingDiscount, value: parseFloat(e.target.value) || 0})}
                          sx={{ width: 60 }}
                        />
                      </Box>
                      <TextField
                        size="small"
                        value={editingDiscount.label}
                        onChange={(e) => setEditingDiscount({...editingDiscount, label: e.target.value})}
                        sx={{ width: '100%', mb: 1 }}
                      />
                      <TextField
                        size="small"
                        value={editingDiscount.description}
                        onChange={(e) => setEditingDiscount({...editingDiscount, description: e.target.value})}
                        sx={{ width: '100%', mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={saveEdit}
                          disabled={!editingDiscount.label || !editingDiscount.description || editingDiscount.value <= 0}
                          sx={{ backgroundColor: '#4caf50', fontSize: '10px', py: 0.5 }}
                        >
                          ✓
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={cancelEdit}
                          sx={{ fontSize: '10px', py: 0.5 }}
                        >
                          ✕
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800', mb: 1 }}>
                        {discount.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        {discount.description}
                      </Typography>
                      {!isEditMode && (
                        <>
                          <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                            -{discountAmount.toFixed(2)} €
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                            {discountedTotal.toFixed(2)} €
                          </Typography>
                        </>
                      )}
                      {isEditMode && (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => editDiscount(discount)}
                            sx={{ fontSize: '10px', py: 0.5 }}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => deleteDiscount(discount.id)}
                            sx={{ fontSize: '10px', py: 0.5, color: '#f44336', borderColor: '#f44336' }}
                          >
                            🗑️
                          </Button>
                        </Box>
                      )}
                    </>
                                     )}
                 </Paper>
               </Box>
             );
           })}
         </Box>

         {selectedDiscount && (
          <Paper sx={{ p: 2, backgroundColor: '#e8f5e8', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, textAlign: 'center' }}>
              Résumé de la remise sélectionnée
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Total original :</Typography>
              <Typography sx={{ textDecoration: 'line-through' }}>
                {originalTotal.toFixed(2)} €
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Remise :</Typography>
              <Typography sx={{ color: '#f44336', fontWeight: 'bold' }}>
                -{(originalTotal - calculateDiscountedTotal(selectedDiscount.type, selectedDiscount.value)).toFixed(2)} €
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 'bold' }}>Nouveau total :</Typography>
              <Typography sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                {calculateDiscountedTotal(selectedDiscount.type, selectedDiscount.value).toFixed(2)} €
              </Typography>
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{ mr: 2 }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={!selectedDiscount}
          sx={{
            backgroundColor: '#ff9800',
            '&:hover': { backgroundColor: '#f57c00' }
          }}
        >
          Appliquer la remise
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlobalDiscountModal; 