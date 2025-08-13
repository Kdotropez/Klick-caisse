import React from 'react';
import { Box, Button, Badge } from '@mui/material';

interface StatsPanelProps {
  width: number;
  height: number;
  onOpenDailyReport: () => void;
  onOpenGlobalDiscount: () => void;
  onOpenSalesRecap: () => void;
  onOpenGlobalTickets: () => void;
  onOpenClosures: () => void;
  onOpenEndOfDay: () => void;
  totalDailyDiscounts?: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  width,
  height,
  onOpenDailyReport,
  onOpenGlobalDiscount,
  onOpenSalesRecap,
  onOpenGlobalTickets,
  onOpenClosures,
  onOpenEndOfDay,
  totalDailyDiscounts = 0,
}) => {
  const padding = 4;
  const gap = 2;
  const cols = 2;
  const rows = 3;
  const totalGapsWidth = (cols - 1) * gap + 2 * gap;
  const totalGapsHeight = (rows - 1) * gap + 2 * gap;
  const totalPaddingWidth = 2 * padding;
  const totalPaddingHeight = 2 * padding;
  const usableWidth = Math.max(0, width - totalGapsWidth - totalPaddingWidth);
  const usableHeight = Math.max(0, height - totalGapsHeight - totalPaddingHeight);
  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;
  const buttonSize = Math.min(cellWidth, cellHeight);
  const fontPx = Math.max(11, Math.floor(buttonSize * 0.18));
  const buttonFont = `${(fontPx / 16).toFixed(2)}rem`;

  const commonButtonSx = {
    flex: 1,
    height: '100%',
    fontSize: buttonFont,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'none' as const,
    lineHeight: 1.2,
    padding: '4px',
    overflow: 'hidden',
    whiteSpace: 'normal' as const,
    wordBreak: 'break-word' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
  } as const;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0.5, gap: 0.25 }}>
      <Box sx={{ display: 'flex', gap: 0.25, flex: 1 }}>
        <Box sx={{ position: 'relative', flex: 1, height: '100%' }}>
          <Button variant="contained" sx={{ ...commonButtonSx, backgroundColor: '#2196f3', '&:hover': { backgroundColor: '#1976d2' }, width: '100%', height: '100%' }} onClick={onOpenDailyReport}>
            Rapport
          </Button>
        </Box>
        <Box sx={{ position: 'relative', flex: 1, height: '100%' }}>
          <Button variant="contained" sx={{ ...commonButtonSx, backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' }, width: '100%', height: '100%' }} onClick={onOpenGlobalDiscount}>
            Remise
          </Button>
          {totalDailyDiscounts > 0 && (
            <Box sx={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#ff4081', color: 'white', px: 0.75, py: 0.25, borderRadius: 1, fontSize: '0.7rem', fontWeight: 'bold' }}>
              {totalDailyDiscounts.toFixed(2)} €
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.25, flex: 1 }}>
        <Button variant="contained" sx={{ ...commonButtonSx, backgroundColor: '#607d8b', '&:hover': { backgroundColor: '#546e7a' } }} onClick={onOpenSalesRecap}>
          Récap ventes
        </Button>
        <Button variant="contained" sx={{ ...commonButtonSx, backgroundColor: '#9e9e9e', '&:hover': { backgroundColor: '#757575' } }} onClick={onOpenGlobalTickets}>
          Tickets globaux
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.25, flex: 1 }}>
        <Button variant="contained" sx={{ ...commonButtonSx, backgroundColor: '#9c27b0', '&:hover': { backgroundColor: '#7b1fa2' } }} onClick={onOpenClosures}>
          Historique clôture
        </Button>
        <Button variant="contained" sx={{ ...commonButtonSx, backgroundColor: '#9e9e9e', '&:hover': { backgroundColor: '#757575' } }} onClick={onOpenEndOfDay}>
          Fin de journée
        </Button>
      </Box>
    </Box>
  );
};

export default StatsPanel;



