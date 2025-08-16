import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Select, MenuItem, FormControl, Autocomplete } from '@mui/material';
import { StorageService } from '../../services/StorageService';

type RuleRow = {
  id: string;
  minQty: number; // 6 ou 12
  subcategory: string; // ex: "verre 6.5"
  target: 'seau' | 'vasque';
  amount: number; // en €
  sourceCategory: 'verres' | 'pack verre';
};

interface DiscountRulesModalProps {
  open: boolean;
  onClose: () => void;
}

const DiscountRulesModal: React.FC<DiscountRulesModalProps> = ({ open, onClose }) => {
  const canonicalizeSubcat = (input: string): string => {
    try {
      const s = StorageService.sanitizeLabel(String(input || '')).toLowerCase();
      const m = s.match(/verre\s*(\d+(?:[.,]\d+)?)/);
      if (!m) return 'verre ' + s.replace(/[^0-9.,]/g, '');
      const n = parseFloat(m[1].replace(',', '.'));
      if (!Number.isFinite(n)) return 'verre ' + m[1].replace(',', '.');
      const oneDecimal = Math.round(n * 10) / 10;
      const label = Number.isInteger(oneDecimal) ? String(Math.round(oneDecimal)) : oneDecimal.toFixed(1);
      return `verre ${label}`;
    } catch { return StorageService.sanitizeLabel(input).toLowerCase(); }
  };
  const initialRows = useMemo<RuleRow[]>(() => {
    try {
      const s = StorageService.loadSettings() || {} as any;
      const r = s.autoDiscountRules || {};
      const seauDefaults: Record<string, number> = {
        'verre 6.5': 19,
        'verre 8.5': 21,
        'verre 10': 20,
        'verre 12': 22,
      };
      const vasqueDefaults: Record<string, number> = {
        'verre 6.5': 23,
        'verre 8.5': 22,
        'verre 10': 20,
        'verre 12': 24,
      };
      const seauFromSettings: Record<string, number> | undefined = r.seauBySubcat;
      const vasqueFromSettings: Record<string, number> | undefined = r.vasqueBySubcat;
      const seau: Record<string, number> = (seauFromSettings && Object.keys(seauFromSettings).length > 0) ? seauFromSettings : seauDefaults;
      const vasque: Record<string, number> = (vasqueFromSettings && Object.keys(vasqueFromSettings).length > 0) ? vasqueFromSettings : vasqueDefaults;
      const rows: RuleRow[] = [];
      for (const [k, v] of Object.entries(seau)) rows.push({ id: `s-${k}`, minQty: 6, subcategory: canonicalizeSubcat(k), target: 'seau', amount: v, sourceCategory: 'verres' });
      for (const [k, v] of Object.entries(vasque)) rows.push({ id: `v-${k}`, minQty: 12, subcategory: canonicalizeSubcat(k), target: 'vasque', amount: v, sourceCategory: 'verres' });
      return rows;
    } catch { return []; }
  }, []);

  const [rows, setRows] = useState<RuleRow[]>(initialRows);
  const subcategoryOptions = useMemo(() => {
    try {
      // Récupérer toutes les sous-catégories connues (registre + storage)
      const all = StorageService.loadSubcategories();
      // Filtrer celles qui ressemblent aux verres ciblés
      const allowed = ['verre 4', 'verre 6.5', 'verre 8.5', 'verre 10', 'verre 12'];
      const set = new Set<string>();
      // Ajouter celles présentes dans le registre
      for (const s of all) {
        const canon = canonicalizeSubcat(s);
        if (allowed.includes(canon)) set.add(canon);
      }
      // Ajouter les valeurs de secours
      for (const w of allowed) set.add(canonicalizeSubcat(w));
      return Array.from(set).sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
    } catch { return ['verre 6.5','verre 8.5','verre 10','verre 12']; }
  }, []);

  useEffect(() => { if (open) setRows(initialRows); }, [open, initialRows]);

  const addRow = () => {
    setRows(prev => [...prev, { id: String(Date.now()), minQty: 6, subcategory: '', target: 'seau', amount: 0, sourceCategory: 'verres' }]);
  };

  const updateRow = (idx: number, patch: Partial<RuleRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const deleteRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const save = () => {
    try {
      const seau: Record<string, number> = {};
      const vasque: Record<string, number> = {};
      for (const r of rows) {
        const key = String(r.subcategory || '').trim();
        if (!key || r.amount <= 0) continue;
        if (r.target === 'seau' && r.minQty === 6) seau[key] = r.amount;
        if (r.target === 'vasque' && r.minQty === 12) vasque[key] = r.amount;
      }
      const s = StorageService.loadSettings() || {} as any;
      const prev = s.autoDiscountRules || {};
      StorageService.saveSettings({ ...s, autoDiscountRules: { ...prev, seauBySubcat: seau, vasqueBySubcat: vasque } });
      onClose();
    } catch {
      onClose();
    }
  };

  // Calcul de la remise compensatoire attendue (barème − remise auto verres)
  const computeCompText = (r: RuleRow): string => {
    try {
      const s = StorageService.loadSettings() || {} as any;
      const rules = s.autoDiscountRules || {};
      const glassDefaults: Record<string, number> = {
        'verre 4': 4.17,
        'verre 4.0': 4.17,
        'verre 6.5': 3.85,
        'verre 6.50': 3.85,
        'verre 8.5': 3.92,
        'verre 8.50': 3.92,
        'verre 10': 5.0,
        'verre 12': 5.56,
      };
      const glassFromSettings: Record<string, number> | undefined = rules.glassBySubcat;
      const glassMap: Record<string, number> = (glassFromSettings && Object.keys(glassFromSettings).length > 0)
        ? glassFromSettings
        : glassDefaults;
      const canonRow = canonicalizeSubcat(r.subcategory);
      // Trouver la clé correspondante dans la map
      let percent = 0;
      for (const [k, v] of Object.entries(glassMap)) {
        if (canonicalizeSubcat(k) === canonRow) { percent = v; break; }
      }
      if (percent <= 0 || r.amount <= 0) return '';
      // Extraire le prix depuis le libellé "verre X" si présent
      const m = canonRow.match(/(\d+(?:[.,]\d+)?)/);
      const unit = m ? parseFloat(m[1].replace(',', '.')) : 0;
      if (unit <= 0) return '';
      const autoDiscount = r.minQty * unit * (percent / 100);
      const net = Math.max(0, r.amount - autoDiscount);
      return `${net.toFixed(2)} €`;
    } catch { return ''; }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#ff9800', color: 'white', fontWeight: 'bold' }}>Barèmes remises (modifiables)</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Pour quantité</TableCell>
                <TableCell>de catégorie</TableCell>
                <TableCell>et sous catégorie</TableCell>
                <TableCell>et quantité</TableCell>
                <TableCell>de catégorie</TableCell>
                <TableCell align="right">pour remise globale (€)</TableCell>
                <TableCell>remise compensatoire (calculée)</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">Aucune règle</TableCell></TableRow>
              ) : rows.map((r, idx) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={r.minQty}
                      onChange={(e)=>updateRow(idx, { minQty: Math.max(1, parseInt(e.target.value || '0', 10) || 1) })}
                      sx={{ width: 90 }}
                      inputProps={{ min: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select value={r.sourceCategory} onChange={(e)=>updateRow(idx, { sourceCategory: e.target.value as RuleRow['sourceCategory'] })}>
                        <MenuItem value="verres">verres</MenuItem>
                        <MenuItem value="pack verre">pack verre</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={subcategoryOptions}
                      value={r.subcategory || ''}
                      onChange={(_, val) => updateRow(idx, { subcategory: val || '' })}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="ex: verre 6.5" />
                      )}
                    />
                  </TableCell>
                  <TableCell>1</TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select value={r.target} onChange={(e) => updateRow(idx, { target: e.target.value as RuleRow['target'] })}>
                        <MenuItem value="seau">seau</MenuItem>
                        <MenuItem value="vasque">vasque</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={r.amount} onChange={(e)=>updateRow(idx, { amount: parseFloat(e.target.value||'0')||0 })} sx={{ width: 110 }} />
                  </TableCell>
                  <TableCell>{computeCompText(r) || '—'}</TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="outlined" color="error" onClick={()=>deleteRow(idx)}>Supprimer</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        <Button onClick={addRow} sx={{ mt: 1 }} variant="outlined">+ Ajouter une règle</Button>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={save} sx={{ backgroundColor: '#ff9800' }}>Sauver</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiscountRulesModal;


