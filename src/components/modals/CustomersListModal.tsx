import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, ListItem, Box, Typography, IconButton } from '@mui/material';
import { Edit, ListAlt } from '@mui/icons-material';
import { Customer } from '../../types/Customer';
import { List } from 'react-window';

interface CustomersListModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onEdit?: (customer: Customer) => void;
  onPick?: (customer: Customer) => void;
  onViewSales?: (customer: Customer) => void;
}

const CustomersListModal: React.FC<CustomersListModalProps> = ({ open, onClose, customers, onEdit, onPick, onViewSales }) => {
  const [q, setQ] = useState('');
  const listBoxRef = useRef<HTMLDivElement | null>(null);
  const [listSize, setListSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const el = listBoxRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      const width = Math.floor(r.width);
      const height = Math.floor(r.height);
      setListSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(c =>
      `${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${c.address} ${c.postalCode} ${c.city} ${c.country}`
        .toLowerCase()
        .includes(needle)
    );
  }, [q, customers]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Clients enregistrés</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Rechercher" value={q} onChange={(e)=>setQ(e.target.value)} sx={{ mb: 2 }} />
        <Box ref={listBoxRef} sx={{ height: '52vh', minHeight: 320, border: '1px solid #eee', borderRadius: 1, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Aucun client</Box>
          ) : (
            listSize.width > 0 && listSize.height > 0 && (
              <List
                style={{ width: listSize.width, height: listSize.height }}
                rowCount={filtered.length}
                rowHeight={56}
                overscanCount={8}
                rowProps={{}}
                rowComponent={({ index, style }: any) => {
                  const c = filtered[index];
                  if (!c) return <div style={style} />;
                  return (
                    <div style={style} key={String(c.id)}>
                      <ListItem
                        sx={{ py: 0.5, borderBottom: '1px solid #eee', cursor: onPick ? 'pointer' : 'default' }}
                        onClick={() => { if (onPick) { onPick(c); } }}
                        secondaryAction={(
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {onViewSales && (
                              <IconButton edge="end" aria-label="sales" onClick={(e) => { e.stopPropagation(); onViewSales(c); }}>
                                <ListAlt />
                              </IconButton>
                            )}
                            {onEdit && (
                              <IconButton edge="end" aria-label="edit" onClick={(e) => { e.stopPropagation(); onEdit(c); }}>
                                <Edit />
                              </IconButton>
                            )}
                          </Box>
                        )}
                      >
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 1, width: '100%' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{c.lastName} {c.firstName}</Typography>
                          <Typography variant="body2">{c.email}</Typography>
                          <Typography variant="body2">{c.phone}</Typography>
                          <Typography variant="body2">{c.postalCode} {c.city}</Typography>
                        </Box>
                      </ListItem>
                    </div>
                  );
                }}
              />
            )
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomersListModal;


