import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface PaymentWindowProps {
  onPaymentMethodSelect: (method: string) => void;
}

const PaymentWindow: React.FC<PaymentWindowProps> = ({
  onPaymentMethodSelect,
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        Modes de Règlement
      </Typography>
      <Box sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          fullWidth
          sx={{ py: 2, fontSize: '1.1rem', fontWeight: 'bold' }}
          onClick={() => onPaymentMethodSelect('cash')}
        >
          💵 Paiement en Espèces
        </Button>
        <Button
          variant="contained"
          fullWidth
          sx={{ py: 2, fontSize: '1.1rem', fontWeight: 'bold' }}
          onClick={() => onPaymentMethodSelect('card')}
        >
          💳 Paiement par Carte
        </Button>
        <Button
          variant="contained"
          fullWidth
          sx={{ py: 2, fontSize: '1.1rem', fontWeight: 'bold' }}
          onClick={() => onPaymentMethodSelect('check')}
        >
          📝 Paiement par Chèque
        </Button>
        <Button
          variant="contained"
          fullWidth
          sx={{ py: 2, fontSize: '1.1rem', fontWeight: 'bold' }}
          onClick={() => onPaymentMethodSelect('sumup')}
        >
          📱 Paiement SumUp
        </Button>
      </Box>
    </Box>
  );
};

export default PaymentWindow; 