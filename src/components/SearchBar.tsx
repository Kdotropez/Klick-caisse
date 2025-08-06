import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  placeholder = "Rechercher un produit ou une catégorie..."
}) => {
  const handleClear = () => {
    onSearchChange('');
  };

  return (
    <Box sx={{ p: 2, pb: 1 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClear}
                edge="end"
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: 'background.paper',
          },
        }}
      />
    </Box>
  );
};

export default SearchBar; 