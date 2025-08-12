import React, { useState } from 'react';
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

  // État local pour expansion par ticket
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
              const qty = Array.isArray(t.items) ? t.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
              const isEx = expandedIds.has(String(t.id));
              return (
                <ListItem key={String(t.id)} sx={{ py: 0.25, borderBottom: '1px solid #eee', display: 'block' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }} onClick={() => setExpandedIds(prev=>{const next=new Set(prev); const k=String(t.id); if(next.has(k)) next.delete(k); else next.add(k); return next;})}>
                    <Typography variant="body2" sx={{ width: 56, textAlign: 'right', fontFamily: 'monospace', color: '#1976d2', cursor: 'pointer' }}>#{String(t.id).slice(-6)}</Typography>
                    <Typography variant="body2" sx={{ width: 120, fontFamily: 'monospace', color: '#666' }}>{new Date(t.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} {new Date(t.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Typography>
                    <Typography variant="body2" sx={{ width: 60, textAlign: 'right', fontFamily: 'monospace' }}>{qty}</Typography>
                    <Typography variant="body2" sx={{ flex: 1 }} />
                    <Typography variant="body2" sx={{ width: 110, textAlign: 'right', fontFamily: 'monospace' }}>{(t.total||0).toFixed(2)} €</Typography>
                  </Box>
                  {isEx && (
                    <Box sx={{ mt: 0.5, pl: 1 }}>
                      {(Array.isArray(t.items)?t.items:[]).map((it:any, idx:number) => (
                        <Box key={`${t.id}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ width: 48, textAlign: 'right', fontFamily: 'monospace' }}>{it.quantity}</Typography>
                          <Typography variant="caption">x</Typography>
                          <Typography variant="caption" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {it.product.name}
                            {it.selectedVariation && (
                              <>
                                {' '}
                                <span style={{ color: '#2196f3', fontStyle: 'italic' }}>
                                  ({it.selectedVariation.attributes})
                                </span>
                              </>
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ width: 90, textAlign: 'right', fontFamily: 'monospace' }}>{((it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice) * (it.quantity || 0)).toFixed(2)} €</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
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
                  const key = `${String(it.product.id)}::${String(it.selectedVariation?.id || 'main')}`;
                  const amount = (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice) * (it.quantity || 0);
                  if (!categoryMap.has(cat)) categoryMap.set(cat, new Map());
                  const prodMap = categoryMap.get(cat)!;
                  const displayName = it.selectedVariation && it.selectedVariation.attributes
                    ? `${(it.product as Product).name} (${it.selectedVariation.attributes})`
                    : (it.product as Product).name;
                  const prev = prodMap.get(key) || { name: displayName, qty: 0, amount: 0 };
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



