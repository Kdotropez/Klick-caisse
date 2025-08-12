import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Divider,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import { Close, Add, Delete, Edit } from '@mui/icons-material';
import { Product, Category, ProductVariation } from '../types/Product';
import { StorageService } from '../services/StorageService';

interface ProductEditModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onSave: (updatedProduct: Product) => void;
  onDelete: (productId: string) => void;
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({
  open,
  onClose,
  product,
  categories,
  onSave,
  onDelete
}) => {
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [newVariation, setNewVariation] = useState({
    attributes: '',
    priceImpact: 0,
    ean13: '',
    reference: ''
  });
  const [showVariationForm, setShowVariationForm] = useState(false);
  const [error, setError] = useState('');
  const [newSubcategory, setNewSubcategory] = useState<string>('');

  useEffect(() => {
    if (product) {
      setEditedProduct({ ...product });
      setError('');
    }
  }, [product]);

  const handleInputChange = (field: keyof Product, value: any) => {
    if (!editedProduct) return;
    
    setEditedProduct({
      ...editedProduct,
      [field]: value
    });
  };

  const addSubcategory = (raw: string) => {
    if (!editedProduct) return;
    const label = StorageService.sanitizeLabel(String(raw || ''))
      .trim();
    if (!label) return;
    const norm = StorageService.normalizeLabel(label);
    const alnum = norm.replace(/[^a-z0-9]/g, '');
    if (alnum.length < 2) return;
    const existing = Array.isArray(editedProduct.associatedCategories) ? editedProduct.associatedCategories : [];
    const hasAlready = existing.some(s => StorageService.normalizeLabel(String(s)).replace(/s$/i,'') === norm.replace(/s$/i,''));
    if (hasAlready) return;
    setEditedProduct({
      ...editedProduct,
      associatedCategories: [...existing, label]
    });
    setNewSubcategory('');
  };

  const removeSubcategory = (label: string) => {
    if (!editedProduct) return;
    const next = (Array.isArray(editedProduct.associatedCategories) ? editedProduct.associatedCategories : [])
      .filter(s => s !== label);
    setEditedProduct({
      ...editedProduct,
      associatedCategories: next
    });
  };

  const handleVariationChange = (variationId: string, field: keyof ProductVariation, value: any) => {
    if (!editedProduct) return;

    setEditedProduct({
      ...editedProduct,
      variations: editedProduct.variations.map(v => 
        v.id === variationId ? { ...v, [field]: value } : v
      )
    });
  };

  const addVariation = () => {
    if (!editedProduct || !newVariation.attributes || newVariation.priceImpact === 0) {
      setError('Veuillez remplir tous les champs de la déclinaison');
      return;
    }

    const variation: ProductVariation = {
      id: `var_${Date.now()}`,
      ean13: newVariation.ean13,
      reference: newVariation.reference,
      attributes: newVariation.attributes,
      priceImpact: newVariation.priceImpact,
      finalPrice: editedProduct.finalPrice + newVariation.priceImpact
    };

    setEditedProduct({
      ...editedProduct,
      variations: [...editedProduct.variations, variation]
    });

    setNewVariation({ attributes: '', priceImpact: 0, ean13: '', reference: '' });
    setShowVariationForm(false);
    setError('');
  };

  const removeVariation = (variationId: string) => {
    if (!editedProduct) return;

    setEditedProduct({
      ...editedProduct,
      variations: editedProduct.variations.filter(v => v.id !== variationId)
    });
  };

  const handleSave = () => {
    if (!editedProduct) return;

    if (!editedProduct.name.trim()) {
      setError('Le nom du produit est obligatoire');
      return;
    }

    if (editedProduct.finalPrice <= 0) {
      setError('Le prix de vente doit être supérieur à 0');
      return;
    }

    onSave(editedProduct);
    onClose();
  };

  const handleDelete = () => {
    if (!editedProduct) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      onDelete(editedProduct.id);
      onClose();
    }
  };

  if (!editedProduct) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Modifier l'article : {editedProduct.name}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Informations de base */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
              Informations de base
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nom du produit"
              value={editedProduct.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              sx={{ mb: 2 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Code barre (EAN13)"
              value={editedProduct.ean13}
              onChange={(e) => handleInputChange('ean13', e.target.value)}
              sx={{ mb: 2 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Prix de vente HT"
              type="number"
              value={editedProduct.finalPrice}
              onChange={(e) => handleInputChange('finalPrice', parseFloat(e.target.value) || 0)}
              inputProps={{ step: 0.01, min: 0 }}
              sx={{ mb: 2 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={editedProduct.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                label="Catégorie"
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

                     <Grid item xs={12} md={6}>
             <TextField
               fullWidth
               label="Prix d'achat HT"
               type="number"
               value={editedProduct.wholesalePrice}
               onChange={(e) => handleInputChange('wholesalePrice', parseFloat(e.target.value) || 0)}
               inputProps={{ step: 0.01, min: 0 }}
               sx={{ mb: 2 }}
             />
           </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Référence"
              value={editedProduct.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              sx={{ mb: 2 }}
            />
          </Grid>

          {/* Sous-catégories */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 1.5, color: '#1976d2', fontWeight: 'bold' }}>
              Sous-catégories
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {(editedProduct.associatedCategories || []).map((sc) => (
                <Chip
                  key={sc}
                  label={sc}
                  onDelete={() => removeSubcategory(sc)}
                  sx={{ backgroundColor: '#e3f2fd' }}
                />
              ))}
            </Box>
            <TextField
              fullWidth
              label="Ajouter une sous-catégorie"
              placeholder="Saisir et appuyer sur Entrée ou virgule"
              value={newSubcategory}
              onChange={(e) => setNewSubcategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addSubcategory(newSubcategory);
                }
              }}
              onBlur={() => addSubcategory(newSubcategory)}
              sx={{ mb: 2 }}
            />
          </Grid>

          {/* Déclinaisons */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                Déclinaisons ({editedProduct.variations.length})
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setShowVariationForm(true)}
                size="small"
              >
                Ajouter déclinaison
              </Button>
            </Box>

            {editedProduct.variations.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {editedProduct.variations.map((variation, index) => (
                  <Box
                    key={variation.id}
                    sx={{
                      p: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Déclinaison {index + 1}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeVariation(variation.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                    
                                         <Grid container spacing={1}>
                       <Grid item xs={12} md={3}>
                         <TextField
                           fullWidth
                           size="small"
                           label="Attributs"
                           value={variation.attributes}
                           onChange={(e) => handleVariationChange(variation.id, 'attributes', e.target.value)}
                         />
                       </Grid>
                       <Grid item xs={12} md={3}>
                         <TextField
                           fullWidth
                           size="small"
                           label="Impact prix"
                           type="number"
                           value={variation.priceImpact}
                           onChange={(e) => handleVariationChange(variation.id, 'priceImpact', parseFloat(e.target.value) || 0)}
                           inputProps={{ step: 0.01 }}
                         />
                       </Grid>
                       <Grid item xs={12} md={3}>
                         <TextField
                           fullWidth
                           size="small"
                           label="Code barre"
                           value={variation.ean13}
                           onChange={(e) => handleVariationChange(variation.id, 'ean13', e.target.value)}
                         />
                       </Grid>
                       <Grid item xs={12} md={3}>
                         <TextField
                           fullWidth
                           size="small"
                           label="Référence"
                           value={variation.reference}
                           onChange={(e) => handleVariationChange(variation.id, 'reference', e.target.value)}
                         />
                       </Grid>
                     </Grid>
                  </Box>
                ))}
              </Box>
            )}

            {showVariationForm && (
              <Box sx={{
                p: 2,
                border: '2px dashed #1976d2',
                borderRadius: 1,
                backgroundColor: '#f0f8ff',
                mb: 2
              }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
                  Nouvelle déclinaison
                </Typography>
                                 <Grid container spacing={1}>
                   <Grid item xs={12} md={3}>
                     <TextField
                       fullWidth
                       size="small"
                       label="Attributs"
                       value={newVariation.attributes}
                       onChange={(e) => setNewVariation({ ...newVariation, attributes: e.target.value })}
                     />
                   </Grid>
                   <Grid item xs={12} md={3}>
                     <TextField
                       fullWidth
                       size="small"
                       label="Impact prix"
                       type="number"
                       value={newVariation.priceImpact}
                       onChange={(e) => setNewVariation({ ...newVariation, priceImpact: parseFloat(e.target.value) || 0 })}
                       inputProps={{ step: 0.01 }}
                     />
                   </Grid>
                   <Grid item xs={12} md={3}>
                     <TextField
                       fullWidth
                       size="small"
                       label="Code barre"
                       value={newVariation.ean13}
                       onChange={(e) => setNewVariation({ ...newVariation, ean13: e.target.value })}
                     />
                   </Grid>
                   <Grid item xs={12} md={3}>
                     <TextField
                       fullWidth
                       size="small"
                       label="Référence"
                       value={newVariation.reference}
                       onChange={(e) => setNewVariation({ ...newVariation, reference: e.target.value })}
                     />
                   </Grid>
                 </Grid>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={addVariation}
                  >
                    Ajouter
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                                         onClick={() => {
                       setShowVariationForm(false);
                       setNewVariation({ attributes: '', priceImpact: 0, ean13: '', reference: '' });
                     }}
                  >
                    Annuler
                  </Button>
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ 
        p: 2, 
        backgroundColor: '#f5f5f5',
        borderTop: '2px solid #e0e0e0'
      }}>
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
          startIcon={<Delete />}
        >
          Supprimer l'article
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} variant="outlined">
          Annuler
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          startIcon={<Edit />}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductEditModal;
