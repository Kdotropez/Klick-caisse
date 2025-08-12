import React from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import { CartItem } from '../../types/Product';
import { formatEuro } from '../../utils/currency';

interface PaymentPanelProps {
  cartItems: CartItem[];
  totalAmount: number;
  paymentTotals: Record<string, number>; // clés attendues: 'Espèces', 'SumUp', 'Carte'
  onPayCash: () => void;
  onPaySumUp: () => void;
  onPayCard: () => void;
  onOpenCashRecap: () => void;
  onOpenSumUpRecap: () => void;
  onOpenCardRecap: () => void;
}

const PaymentPanel: React.FC<PaymentPanelProps> = ({
  cartItems,
  totalAmount,
  paymentTotals,
  onPayCash,
  onPaySumUp,
  onPayCard,
  onOpenCashRecap,
  onOpenSumUpRecap,
  onOpenCardRecap,
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 0.5, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {/* Boutons de mode de règlement */}
        <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
          <Button
            variant="contained"
            sx={{ flex: 1, py: 1, fontSize: '1.1rem', fontWeight: 'bold', minHeight: '60px', backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' }, '&:disabled': { backgroundColor: '#ccc' }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
            onClick={onPayCash}
            disabled={cartItems.length === 0}
          >
            <Box sx={{ fontSize: '1rem', fontWeight: 'bold', lineHeight: 1.2 }}>ESPÈCES</Box>
            <Box sx={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1.2 }}>{formatEuro(totalAmount)}</Box>
          </Button>
          <Button
            variant="contained"
            sx={{ flex: 1, py: 1, fontSize: '1.1rem', fontWeight: 'bold', minHeight: '60px', backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' }, '&:disabled': { backgroundColor: '#ccc' }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
            onClick={onPaySumUp}
            disabled={cartItems.length === 0}
          >
            <Box sx={{ fontSize: '1rem', fontWeight: 'bold', lineHeight: 1.2 }}>SumUp</Box>
            <Box sx={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1.2 }}>{formatEuro(totalAmount)}</Box>
          </Button>
          <Button
            variant="contained"
            sx={{ flex: 1, py: 1, fontSize: '1.1rem', fontWeight: 'bold', minHeight: '60px', backgroundColor: '#ff9800', '&:hover': { backgroundColor: '#f57c00' }, '&:disabled': { backgroundColor: '#ccc' }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
            onClick={onPayCard}
            disabled={cartItems.length === 0}
          >
            <Box sx={{ fontSize: '1rem', fontWeight: 'bold', lineHeight: 1.2 }}>Carte</Box>
            <Box sx={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1.2 }}>{formatEuro(totalAmount)}</Box>
          </Button>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {/* Cumul par mode */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            variant="outlined"
            sx={{ flex: 1, py: 0.5, fontSize: '1.1rem', fontWeight: 800, minHeight: '35px', borderColor: '#2e7d32', color: '#2e7d32', '&:hover': { borderColor: '#1b5e20', backgroundColor: '#e8f5e8' } }}
            onClick={onOpenCashRecap}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8, mb: 0.25 }}>Cumul espèces</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>{formatEuro(paymentTotals['Espèces'])}</Typography>
            </Box>
          </Button>
          <Button
            variant="outlined"
            sx={{ flex: 1, py: 0.5, fontSize: '1.1rem', fontWeight: 800, minHeight: '35px', borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1565c0', backgroundColor: '#e3f2fd' } }}
            onClick={onOpenSumUpRecap}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8, mb: 0.25 }}>Cumul SumUp</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>{formatEuro(paymentTotals['SumUp'])}</Typography>
            </Box>
          </Button>
          <Button
            variant="outlined"
            sx={{ flex: 1, py: 0.5, fontSize: '1.1rem', fontWeight: 800, minHeight: '35px', borderColor: '#ff9800', color: '#ff9800', '&:hover': { borderColor: '#f57c00', backgroundColor: '#fff3e0' } }}
            onClick={onOpenCardRecap}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8, mb: 0.25 }}>Cumul carte</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>{formatEuro(paymentTotals['Carte'])}</Typography>
            </Box>
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PaymentPanel;



