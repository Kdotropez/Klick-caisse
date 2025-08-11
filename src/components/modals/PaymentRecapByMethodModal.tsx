import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, Typography } from '@mui/material';
import { Transaction, Product } from '../../types/Product';

export type PaymentRecapSort = 'qty' | 'amount' | 'name' | 'category' | 'subcategory';
export type PaymentMethodKey = 'cash' | 'card' | 'sumup';

interface PaymentRecapByMethodModalProps {
  open: boolean;
  onClose: () => void;
  method: PaymentMethodKey;
  sort: PaymentRecapSort;
  onChangeSort: (s: PaymentRecapSort) => void;
  transactions: Transaction[];
}

const PaymentRecapByMethodModal: React.FC<PaymentRecapByMethodModalProps> = ({ open, onClose, method, sort, onChangeSort, transactions }) => {
  const filtered = transactions.filter(t => {
    const m = String((t as any).paymentMethod || '').toLowerCase();
    if (method === 'cash') return m === 'cash' || m.includes('esp');
    if (method === 'card') return m === 'card' || m.includes('carte');
    if (method === 'sumup') return m === 'sumup';
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'qty') {
      const qa = Array.isArray(a.items) ? a.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
      const qb = Array.isArray(b.items) ? b.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
      if (qa !== qb) return qb - qa;
    } else if (sort === 'amount') {
      if ((a.total || 0) !== (b.total || 0)) return (b.total || 0) - (a.total || 0);
    } else if (sort === 'name') {
      const an = Array.isArray(a.items) && a.items.length > 0 ? a.items[0].product.name : '';
      const bn = Array.isArray(b.items) && b.items.length > 0 ? b.items[0].product.name : '';
      if (an !== bn) return an.localeCompare(bn);
    } else if (sort === 'category') {
      const ac = Array.isArray(a.items) && a.items.length > 0 ? a.items[0].product.category : '';
      const bc = Array.isArray(b.items) && b.items.length > 0 ? b.items[0].product.category : '';
      if (ac !== bc) return ac.localeCompare(bc);
    } else if (sort === 'subcategory') {
      const asub = Array.isArray(a.items) && a.items.length > 0 ? ((a.items[0].product.associatedCategories && a.items[0].product.associatedCategories[0]) || '') : '';
      const bsub = Array.isArray(b.items) && b.items.length > 0 ? ((b.items[0].product.associatedCategories && b.items[0].product.associatedCategories[0]) || '') : '';
      if (asub !== bsub) return asub.localeCompare(bsub);
    }
    return String(a.id).localeCompare(String(b.id));
  });

  const totalAmount = filtered.reduce((s, t) => s + (t.total || 0), 0);

  const title = method === 'cash' ? 'Tickets Espèces' : method === 'card' ? 'Tickets Carte' : 'Tickets SumUp';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant={sort==='qty'?'contained':'outlined'} onClick={() => onChangeSort('qty')}>Tri quantité</Button>
          <Button size="small" variant={sort==='amount'?'contained':'outlined'} onClick={() => onChangeSort('amount')}>Tri montant</Button>
          <Button size="small" variant={sort==='name'?'contained':'outlined'} onClick={() => onChangeSort('name')}>Tri nom</Button>
          <Button size="small" variant={sort==='category'?'contained':'outlined'} onClick={() => onChangeSort('category')}>Tri famille</Button>
          <Button size="small" variant={sort==='subcategory'?'contained':'outlined'} onClick={() => onChangeSort('subcategory')}>Tri sous-famille</Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
            Total: {totalAmount.toFixed(2)} €
          </Typography>
        </Box>
        {sort !== 'category' ? (
          <List dense>
            {sorted.map(t => {
              const firstName = Array.isArray(t.items) && t.items.length > 0 ? t.items[0].product.name : '(vide)';
              const qty = Array.isArray(t.items) ? t.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
              return (
                <ListItem key={String(t.id)} sx={{ py: 0.25, borderBottom: '1px solid #eee' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                    <Typography variant="body2" sx={{ width: 48, textAlign: 'right', fontFamily: 'monospace' }}>{qty}</Typography>
                    <Typography variant="body2" sx={{ px: 0.5 }}>x</Typography>
                    <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstName}</Typography>
                    <Typography variant="body2" sx={{ width: 110, textAlign: 'right', fontFamily: 'monospace' }}>{(t.total||0).toFixed(2)} €</Typography>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        ) : (
          <List dense>
            {(() => {
              const categoryMap = new Map<string, Map<string, { name: string; qty: number; amount: number }>>();
              for (const tx of filtered) {
                const items = Array.isArray(tx.items) ? tx.items : [];
                for (const it of items as any[]) {
                  const cat = (it.product.category || '') as string;
                  const key = it.product.id as string;
                  const amount = (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice) * (it.quantity || 0);
                  if (!categoryMap.has(cat)) categoryMap.set(cat, new Map());
                  const prodMap = categoryMap.get(cat)!;
                  const prev = prodMap.get(key) || { name: (it.product as Product).name, qty: 0, amount: 0 };
                  prev.qty += (it.quantity || 0);
                  prev.amount += amount;
                  prodMap.set(key, prev);
                }
              }
              const categories = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b));
              return categories.map(cat => {
                const prodMap = categoryMap.get(cat)!;
                const lines = Array.from(prodMap.values()).sort((a, b) => b.qty - a.qty);
                return (
                  <Box key={cat} sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 0.5 }}>Famille {cat}:</Typography>
                    {lines.map(line => (
                      <ListItem key={cat + '::' + line.name} sx={{ py: 0.25, borderBottom: '1px dashed #eee' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                          <Typography variant="body2" sx={{ width: 48, textAlign: 'right', fontFamily: 'monospace' }}>{line.qty}</Typography>
                          <Typography variant="body2" sx={{ px: 0.5 }}>x</Typography>
                          <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.name}</Typography>
                          <Typography variant="body2" sx={{ width: 110, textAlign: 'right', fontFamily: 'monospace' }}>{line.amount.toFixed(2)} €</Typography>
                        </Box>
                      </ListItem>
                    ))}
                  </Box>
                );
              });
            })()}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentRecapByMethodModal;



