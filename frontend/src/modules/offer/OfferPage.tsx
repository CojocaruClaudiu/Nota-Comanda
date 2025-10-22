// src/modules/offer/OfferPage.tsx
import React, { useState } from "react";
import { Box, Typography, Paper, Button, Stack, TextField, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import * as XLSX from "xlsx";

const OFFER_TEMPLATE_URL = "/offer-template.xlsx";

const OfferPage: React.FC = () => {
  const [items, setItems] = useState([{ name: "", qty: 1, price: 0 }]);

  const handleItemChange = (idx: number, field: string, value: any) => {
    setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => {
    setItems(items => [...items, { name: "", qty: 1, price: 0 }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items => items.filter((_, i) => i !== idx));
  };

  async function exportOfferToExcel() {
    // Fetch the template as ArrayBuffer
    const response = await fetch(OFFER_TEMPLATE_URL);
    const arrayBuffer = await response.arrayBuffer();
    // Read workbook from template
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    // Assume first sheet is where items go
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    // Insert items starting at row 5 (example)
    items.forEach((item, i) => {
      const row = 5 + i;
      ws[`A${row}`] = { t: "s", v: item.name };
      ws[`B${row}`] = { t: "n", v: item.qty };
      ws[`C${row}`] = { t: "n", v: item.price };
    });
    // Export workbook
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oferta-export.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Ofertare
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Creează, editează și gestionează oferte pentru clienți și proiecte.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" color="primary" onClick={handleAddItem}>
            Adaugă produs
          </Button>
          <Button variant="outlined" color="success" onClick={exportOfferToExcel}>
            Exportă în Excel
          </Button>
        </Stack>
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Produse ofertă</Typography>
          <Stack spacing={2}>
            {items.map((item, idx) => (
              <Stack direction="row" spacing={2} alignItems="center" key={idx}>
                <TextField
                  label="Produs"
                  value={item.name}
                  onChange={e => handleItemChange(idx, "name", e.target.value)}
                  sx={{ minWidth: 180 }}
                />
                <TextField
                  label="Cantitate"
                  type="number"
                  value={item.qty}
                  onChange={e => handleItemChange(idx, "qty", Number(e.target.value))}
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Preț"
                  type="number"
                  value={item.price}
                  onChange={e => handleItemChange(idx, "price", Number(e.target.value))}
                  sx={{ width: 120 }}
                />
                <IconButton onClick={() => handleRemoveItem(idx)} color="error" disabled={items.length === 1}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default OfferPage;
