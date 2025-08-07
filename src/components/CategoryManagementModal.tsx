import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Typography,
  Divider,
  Alert
} from '@mui/material';
import { Delete, Edit, Add, ColorLens } from '@mui/icons-material';
import { Category } from '../types/Product';

interface CategoryManagementModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onUpdateCategories: (newCategories: Category[]) => void;
}

const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  open,
  onClose,
  categories,
  onUpdateCategories
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#757575');
  const [error, setError] = useState('');

  // Couleurs prédéfinies pour les catégories
  const predefinedColors = [
    '#757575', '#FF9800', '#FFC107', '#8BC34A', '#607D8B',
    '#9C27B0', '#00BCD4', '#E91E63', '#795548', '#2196F3',
    '#FF5722', '#4CAF50', '#3F51B5', '#FF4081', '#009688'
  ];

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      setError('Le nom de la catégorie est requis');
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase())) {
      setError('Une catégorie avec ce nom existe déjà');
      return;
    }

    const newCategory: Category = {
      id: (categories.length + 1).toString(),
      name: newCategoryName.trim(),
      color: newCategoryColor,
      productOrder: []
    };

    const updatedCategories = [...categories, newCategory];
    onUpdateCategories(updatedCategories);
    
    setNewCategoryName('');
    setNewCategoryColor('#757575');
    setError('');
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
    setError('');
  };

  const handleSaveEdit = () => {
    if (!editingCategory || !newCategoryName.trim()) {
      setError('Le nom de la catégorie est requis');
      return;
    }

    const existingCategory = categories.find(cat => 
      cat.id !== editingCategory.id && 
      cat.name.toLowerCase() === newCategoryName.toLowerCase()
    );

    if (existingCategory) {
      setError('Une catégorie avec ce nom existe déjà');
      return;
    }

    const updatedCategories = categories.map(cat =>
      cat.id === editingCategory.id
        ? { ...cat, name: newCategoryName.trim(), color: newCategoryColor }
        : cat
    );

    onUpdateCategories(updatedCategories);
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor('#757575');
    setError('');
  };

  const handleDeleteCategory = (categoryId: string) => {
    // Vérifier si la catégorie contient des produits
    const hasProducts = false; // TODO: Vérifier avec les produits
    
    if (hasProducts) {
      setError('Impossible de supprimer une catégorie qui contient des produits');
      return;
    }

    // Trouver la catégorie à supprimer pour afficher son nom
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    
    if (!categoryToDelete) {
      setError('Catégorie introuvable');
      return;
    }

    // Demander confirmation avant la suppression
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete.name}" ?\n\nCette action est irréversible.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // L'utilisateur a annulé
    }

    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    onUpdateCategories(updatedCategories);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor('#757575');
    setError('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ColorLens />
          Gestion des Catégories
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Section d'ajout/modification */}
        <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {editingCategory ? 'Modifier la catégorie' : 'Ajouter une nouvelle catégorie'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Nom de la catégorie"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Couleur"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              size="small"
              sx={{ width: 120 }}
              InputProps={{
                style: { backgroundColor: newCategoryColor }
              }}
            />
          </Box>

          {/* Couleurs prédéfinies */}
          <Typography variant="body2" sx={{ mb: 1 }}>
            Couleurs prédéfinies :
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {predefinedColors.map((color) => (
              <Box
                key={color}
                sx={{
                  width: 30,
                  height: 30,
                  backgroundColor: color,
                  border: newCategoryColor === color ? '3px solid #000' : '1px solid #ccc',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'scale(1.1)'
                  }
                }}
                onClick={() => setNewCategoryColor(color)}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {editingCategory ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={handleSaveEdit}
                  size="small"
                >
                  Sauvegarder
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  size="small"
                >
                  Annuler
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddCategory}
                size="small"
              >
                Ajouter
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Liste des catégories existantes */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Catégories existantes ({categories.length})
        </Typography>
        
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {categories.map((category) => (
            <ListItem
              key={category.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                backgroundColor: 'background.paper'
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: category.color,
                  borderRadius: '50%',
                  mr: 2,
                  flexShrink: 0
                }}
              />
              <ListItemText
                primary={category.name}
                secondary={`ID: ${category.id}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleEditCategory(category)}
                  sx={{ mr: 1 }}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  edge="end"
                  onClick={() => handleDeleteCategory(category.id)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryManagementModal; 