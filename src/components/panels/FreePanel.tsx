import React from 'react';
import { Box, Button } from '@mui/material';
import { useUISettings } from '../../context/UISettingsContext';

interface FreePanelProps {
  width: number;
  height: number;
  getScaledFontSize: (base: string) => string;
  highlight?: boolean;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onRepairEANArticles?: (file: File) => Promise<void>;
  onRepairEANVariations?: (file: File) => Promise<void>;
  onRepairEANArticlesFromGitHub?: () => Promise<void>;
  onCleanUnusedCategories?: () => void;
  onPurgeCategories?: () => void;
  onAuditEAN13?: () => void;
}

const FreePanel: React.FC<FreePanelProps> = ({ 
  width, 
  height, 
  getScaledFontSize, 
  highlight, 
  isEditMode, 
  onToggleEditMode 
}) => {
  const { compactMode, setCompactMode, autoFit, setAutoFit } = useUISettings();
  const gap = 2;
  const totalGapsWidth = 4;
  const totalGapsHeight = 6;
  const totalPaddingWidth = 8;
  const totalPaddingHeight = 8;
  const availableWidth = width - totalGapsWidth - totalPaddingWidth;
  const availableHeight = height - totalGapsHeight - totalPaddingHeight;
  const buttonWidth = Math.floor(availableWidth / 3);
  const buttonHeight = Math.floor(availableHeight / 4);

  const commonButtonSx = {
    width: '100%',
    height: '100%',
    fontSize: getScaledFontSize('0.65rem'),
    fontWeight: 'bold',
    boxSizing: 'border-box',
    overflow: 'hidden',
    textTransform: 'none' as const,
    lineHeight: 1.1,
    padding: '2px',
  } as const;

  const colors = [
    ['#f44336', '#d32f2f'],
    ['#e91e63', '#c2185b'],
    ['#9c27b0', '#7b1fa2'],
    ['#673ab7', '#512da8'],
    ['#3f51b5', '#303f9f'],
    ['#2196f3', '#1976d2'],
    ['#03a9f4', '#0288d1'],
    ['#00bcd4', '#0097a7'],
    ['#009688', '#00796b'],
    ['#4caf50', '#388e3c'],
    ['#8bc34a', '#689f38'],
    ['#cddc39', '#afb42b'],
  ] as const;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${buttonWidth}px)`,
        gridTemplateRows: `repeat(4, ${buttonHeight}px)`,
        gap: `${gap}px`,
        p: 0.5,
        boxSizing: 'border-box',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: highlight ? '#e8f5e8' : 'transparent',
        border: highlight ? '2px solid #4caf50' : 'none',
        borderRadius: highlight ? '8px' : '0px',
      }}
    >
      {colors.map(([bg, hover], idx) => {
        if (idx === 0) {
          return (
            <Button
              key={idx}
              variant="contained"
              sx={{ ...commonButtonSx, backgroundColor: compactMode ? '#2e7d32' : bg, '&:hover': { backgroundColor: compactMode ? '#1b5e20' : hover } }}
              onClick={() => setCompactMode(!compactMode)}
            >
              {`Mode compact: ${compactMode ? 'ON' : 'OFF'}`}
            </Button>
          );
        }
        if (idx === 1) {
          return (
            <Button
              key={idx}
              variant="contained"
              sx={{ ...commonButtonSx, backgroundColor: autoFit ? '#1976d2' : bg, '&:hover': { backgroundColor: autoFit ? '#1565c0' : hover } }}
              onClick={() => setAutoFit(!autoFit)}
            >
              {`Auto-fit: ${autoFit ? 'ON' : 'OFF'}`}
            </Button>
          );
        }
        if (idx === 2) {
          return (
            <Button
              key={idx}
              variant="contained"
              sx={{ ...commonButtonSx, backgroundColor: isEditMode ? '#f44336' : bg, '&:hover': { backgroundColor: isEditMode ? '#d32f2f' : hover } }}
              onClick={onToggleEditMode}
            >
              {isEditMode ? 'Mode Vente' : 'Modifier Article'}
            </Button>
          );
        }
        return (
          <Button
            key={idx}
            variant="contained"
            sx={{ ...commonButtonSx, backgroundColor: bg, '&:hover': { backgroundColor: hover } }}
            onClick={() => console.log(`Libre ${idx + 1}`)}
          >
            {`Libre ${idx + 1}`}
          </Button>
        );
      })}
    </Box>
  );
};

export default FreePanel;


