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
import { Delete, Edit, Add, ColorLens, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

    // Utiliser une couleur unique par défaut si aucune couleur n'est sélectionnée
    const finalColor = newCategoryColor === '#757575' ? getUniqueColor(categories.length) : newCategoryColor;

    const newCategory: Category = {
      id: (categories.length + 1).toString(),
      name: newCategoryName.trim(),
      color: finalColor,
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
    setNewCategoryColor(category.color || '#757575');
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
    // Trouver la catégorie à supprimer pour afficher son nom
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    
    if (!categoryToDelete) {
      setError('Catégorie introuvable');
      return;
    }

    // Demander confirmation avant la suppression
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete.name}" ?\n\nLes articles de cette catégorie seront déplacés vers "À classer".`;
    
    if (!window.confirm(confirmMessage)) {
      return; // L'utilisateur a annulé
    }

    // Créer ou trouver la catégorie "À classer"
    let aClasserCategory = categories.find(cat => cat.name.toLowerCase() === 'à classer');
    
    if (!aClasserCategory) {
      aClasserCategory = {
        id: `cat_${Date.now()}`,
        name: 'À classer',
        color: '#f5f5f5', // Fond gris clair
        productOrder: []
      };
    }

    // Supprimer la catégorie et ajouter "À classer" si elle n'existe pas
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    
    if (!categories.find(cat => cat.name.toLowerCase() === 'à classer')) {
      updatedCategories.push(aClasserCategory);
    }

    onUpdateCategories(updatedCategories);
    setError('');
    
    console.log(`🗑️ Catégorie "${categoryToDelete.name}" supprimée. Articles redirigés vers "À classer"`);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor('#757575');
    setError('');
  };

  const handleMoveCategory = (categoryId: string, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(cat => cat.id === categoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const updatedCategories = [...categories];
    const [movedCategory] = updatedCategories.splice(currentIndex, 1);
    updatedCategories.splice(newIndex, 0, movedCategory);

    onUpdateCategories(updatedCategories);
  };

  // Réorganisation par glisser-déposer
  const handleDragStart = (index: number) => () => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;
    const updated = [...categories];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setDragIndex(null);
    onUpdateCategories(updated);
  };

  // Fonction pour déterminer la couleur de police selon la couleur de fond
  const getTextColor = (backgroundColor: string) => {
    // Convertir la couleur hex en RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculer la luminosité
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Retourner blanc si le fond est sombre, noir sinon
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Fonction pour générer une couleur unique pour chaque catégorie
  const getUniqueColor = (index: number) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
      '#FAD7A0', '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7'
    ];
    return colors[index % colors.length];
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
               label="Couleur de fond"
               value={newCategoryColor}
               onChange={(e) => setNewCategoryColor(e.target.value)}
               size="small"
               sx={{ width: 120 }}
               InputProps={{
                 style: { 
                   backgroundColor: newCategoryColor,
                   color: getTextColor(newCategoryColor),
                   fontWeight: 'bold'
                 }
               }}
             />
          </Box>

          {/* Couleurs prédéfinies */}
          <Typography variant="body2" sx={{ mb: 1 }}>
            Couleurs de fond prédéfinies :
          </Typography>
                     <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
             {predefinedColors.map((color) => (
               <Box
                 key={color}
                 sx={{
                   width: 40,
                   height: 30,
                   backgroundColor: color,
                   border: newCategoryColor === color ? '3px solid #000' : '1px solid #ccc',
                   borderRadius: '4px',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   color: getTextColor(color),
                   fontWeight: 'bold',
                   fontSize: '0.8rem',
                   '&:hover': {
                     transform: 'scale(1.05)',
                     boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                   }
                 }}
                 onClick={() => setNewCategoryColor(color)}
               >
                 Aa
               </Box>
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
          Catégories existantes ({categories.length}) - Glissez pour réorganiser
        </Typography>
        
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {categories.map((category, index) => (
            <ListItem
              key={category.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                backgroundColor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                opacity: dragIndex === index ? 0.6 : 1,
              }}
              draggable
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(index)}
            >
              {/* Indicateur de position */}
              <Typography 
                variant="caption" 
                sx={{ 
                  mr: 1, 
                  color: '#666',
                  minWidth: '20px',
                  textAlign: 'center'
                }}
              >
                {index + 1}
              </Typography>

                             {/* Aperçu de la couleur de fond */}
               <Box
                 sx={{
                   width: 60,
                   height: 30,
                   backgroundColor: category.color || '#757575',
                   borderRadius: '4px',
                   mr: 2,
                   flexShrink: 0,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   color: getTextColor(category.color || '#757575'),
                   fontWeight: 'bold',
                   fontSize: '0.8rem',
                   border: '1px solid #ccc'
                 }}
               >
                 {category.name.slice(0, 2)}
               </Box>

              <ListItemText
                primary={category.name}
                secondary={`Position: ${index + 1} | ID: ${category.id}`}
              />

              <ListItemSecondaryAction>
                {/* Boutons de déplacement */}
                <IconButton
                  size="small"
                  onClick={() => handleMoveCategory(category.id, 'up')}
                  disabled={index === 0}
                  sx={{ mr: 0.5 }}
                >
                  <KeyboardArrowUp />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleMoveCategory(category.id, 'down')}
                  disabled={index === categories.length - 1}
                  sx={{ mr: 1 }}
                >
                  <KeyboardArrowDown />
                </IconButton>

                {/* Boutons d'édition et suppression */}
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