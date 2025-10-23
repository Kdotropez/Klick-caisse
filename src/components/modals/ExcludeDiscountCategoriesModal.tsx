import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField, Typography, Divider } from '@mui/material';
import { StorageService } from '../../services/StorageService';

interface ExcludeDiscountCategoriesModalProps {
  open: boolean;
  onClose: () => void;
}

const ExcludeDiscountCategoriesModal: React.FC<ExcludeDiscountCategoriesModalProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<string[]>([]);
  const [selectedSub, setSelectedSub] = useState<string[]>([]);
  const [subQuery, setSubQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    try {
      const cats = (StorageService.loadCategories() || []) as any[];
      setAllCategories(cats.map(c => ({ id: c.id, name: c.name })));
      const settings = StorageService.loadSettings() || {};
      const excluded: string[] = Array.isArray(settings.excludedDiscountCategories) ? settings.excludedDiscountCategories : [];
      setSelected(excluded);
      const subs = StorageService.loadSubcategories() || [];
      setAllSubcategories(subs);
      const excludedSub: string[] = Array.isArray((settings as any).excludedDiscountSubcategories) ? (settings as any).excludedDiscountSubcategories : [];
      setSelectedSub(excludedSub);
      const products = (StorageService.loadProducts() || []) as any[];
      setAllProducts(products.map(p => ({ id: p.id, name: p.name })));
      const excludedProd: string[] = Array.isArray((settings as any).excludedDiscountProductIds) ? (settings as any).excludedDiscountProductIds : [];
      setSelectedProducts(excludedProd);
    } catch {}
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allCategories;
    return allCategories.filter(c => (c.name || '').toLowerCase().includes(needle));
  }, [query, allCategories]);

  const filteredSub = useMemo(() => {
    const needle = subQuery.trim().toLowerCase();
    if (!needle) return allSubcategories;
    return allSubcategories.filter(n => String(n||'').toLowerCase().includes(needle));
  }, [subQuery, allSubcategories]);

  const filteredProducts = useMemo(() => {
    const needle = productQuery.trim().toLowerCase();
    if (!needle) return allProducts;
    return allProducts.filter(p => (p.name||'').toLowerCase().includes(needle) || (p.id||'').toLowerCase().includes(needle));
  }, [productQuery, allProducts]);

  const toggle = (name: string, checked: boolean) => {
    setSelected(prev => checked ? Array.from(new Set([...prev, name])) : prev.filter(n => n !== name));
  };

  const save = () => {
    const settings = StorageService.loadSettings() || {};
    (settings as any).excludedDiscountCategories = selected;
    (settings as any).excludedDiscountSubcategories = selectedSub;
    (settings as any).excludedDiscountProductIds = selectedProducts;
    StorageService.saveSettings(settings);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Exclure des catégories des remises</DialogTitle>
      <DialogContent>
        <TextField fullWidth size="small" placeholder="Rechercher une catégorie…" value={query} onChange={(e)=>setQuery(e.target.value)} sx={{ mb: 1 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, maxHeight: 360, overflow: 'auto' }}>
          {filtered.map(c => {
            const checked = selected.includes(c.name);
            return (
              <FormControlLabel key={c.id} control={<Checkbox size="small" checked={checked} onChange={(e)=>toggle(c.name, e.target.checked)} />} label={<Typography variant="body2">{c.name}</Typography>} />
            );
          })}
          {filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary">Aucune catégorie</Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Sous-catégories</Typography>
        <TextField fullWidth size="small" placeholder="Rechercher une sous-catégorie…" value={subQuery} onChange={(e)=>setSubQuery(e.target.value)} sx={{ mb: 1 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, maxHeight: 360, overflow: 'auto' }}>
          {filteredSub.map(name => {
            const checked = selectedSub.includes(name);
            return (
              <FormControlLabel key={name} control={<Checkbox size="small" checked={checked} onChange={(e)=>setSelectedSub(prev=> e.target.checked ? Array.from(new Set([...prev, name])) : prev.filter(n=>n!==name))} />} label={<Typography variant="body2">{name}</Typography>} />
            );
          })}
          {filteredSub.length === 0 && (
            <Typography variant="body2" color="text.secondary">Aucune sous-catégorie</Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Articles (produits)</Typography>
        <TextField fullWidth size="small" placeholder="Rechercher un produit (nom ou ID)…" value={productQuery} onChange={(e)=>setProductQuery(e.target.value)} sx={{ mb: 1 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, maxHeight: 360, overflow: 'auto' }}>
          {filteredProducts.map(p => {
            const checked = selectedProducts.includes(p.id);
            return (
              <FormControlLabel key={p.id} control={<Checkbox size="small" checked={checked} onChange={(e)=>setSelectedProducts(prev=> e.target.checked ? Array.from(new Set([...prev, p.id])) : prev.filter(id=>id!==p.id))} />} label={<Typography variant="body2">{p.name}</Typography>} />
            );
          })}
          {filteredProducts.length === 0 && (
            <Typography variant="body2" color="text.secondary">Aucun produit</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={save}>Enregistrer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExcludeDiscountCategoriesModal;


