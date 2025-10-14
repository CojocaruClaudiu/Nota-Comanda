# Fișă Tehnică - Visual Guide

## 📸 Materials Table View

### Before:
```
┌─────────────────────────────────────────────────────┐
│ Fișă Tehnică                                        │
├─────────────────────────────────────────────────────┤
│ [Disponibil] [✏️]          ← Small outlined chip   │
│ or                                                  │
│ [Încarcă]                  ← Small chip            │
└─────────────────────────────────────────────────────┘
```

### After:
```
┌──────────────────────────────────────────────────────────────┐
│ Fișă Tehnică                                                 │
├──────────────────────────────────────────────────────────────┤
│ ✅ [Disponibil] [👁️] [⬇️] [✏️]  ← Filled chip + 3 actions │
│ or                                                           │
│ [☁️ Încarcă]                    ← Dashed button with icon  │
└──────────────────────────────────────────────────────────────┘
```

**Improvements:**
- ✅ Filled chip instead of outlined (more prominent)
- ✅ 4 inline actions instead of 1-2
- ✅ View button for instant preview (no dialog needed)
- ✅ Download button for quick save
- ✅ Better visual hierarchy with icons

---

## 📋 Upload Dialog

### Opening the Dialog

**When File Exists:**
```
╔═══════════════════════════════════════════════════════╗
║                  Fișă Tehnică                         ║
║               Material Name Here                      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║ ┌─────────────────────────────────────────────────┐ ║
║ │ ✅ Fișă tehnică existentă                       │ ║ ← Green section
║ │                                                 │ ║
║ │ 📄 filename.pdf [Vizualizează] [Șterge]       │ ║
║ └─────────────────────────────────────────────────┘ ║
║ ────────────────────────────────────────────────────  ║ ← Divider
║                                                       ║
║ Înlocuiește cu un fișier nou                         ║
║ ┌─────────────────────────────────────────────────┐ ║
║ │          ☁️                                     │ ║
║ │   Trage și plasează fișierul aici               │ ║ ← Large dropzone
║ │   sau folosește butonul de mai jos              │ ║
║ │                                                 │ ║
║ │        [Alege fișier]                          │ ║
║ └─────────────────────────────────────────────────┘ ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                 [Anulează] [Încarcă fișa tehnică]    ║
╚═══════════════════════════════════════════════════════╝
```

**When No File:**
```
╔═══════════════════════════════════════════════════════╗
║                  Fișă Tehnică                         ║
║               Material Name Here                      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║ Încarcă fișa tehnică                                 ║
║ ┌─────────────────────────────────────────────────┐ ║
║ │               ☁️                                │ ║
║ │         (BIG CLOUD ICON)                        │ ║ ← Prominent
║ │                                                 │ ║
║ │   Trage și plasează fișierul aici               │ ║
║ │   sau folosește butonul de mai jos              │ ║
║ │                                                 │ ║
║ │        [Alege fișier]                          │ ║
║ └─────────────────────────────────────────────────┘ ║
║                                                       ║
║ ℹ️  Tipuri permise: PDF, DOC, DOCX, XLS, XLSX...   ║
║     Dimensiune maximă: 10MB                          ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                 [Anulează] [Încarcă fișa tehnică]    ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🎨 Color-Coded File Types

### File Type Icons & Colors:

| File Type | Icon | Chip Color | Example |
|-----------|------|------------|---------|
| **PDF** | 📄 (Red PDF icon) | 🔴 Error (Red) | `[📄 document.pdf]` |
| **Word** | 📃 (Blue doc icon) | 🔵 Info (Blue) | `[📃 specs.docx]` |
| **Excel** | 📊 (Green table icon) | 🟢 Success (Green) | `[📊 data.xlsx]` |
| **Images** | 🖼️ (Yellow image icon) | 🟡 Warning (Orange) | `[🖼️ photo.jpg]` |

### Visual Examples:

```
Current file section (green background):
┌─────────────────────────────────────────┐
│ ✅ Fișă tehnică existentă               │
│                                         │
│ 📄 technical-spec.pdf                  │  ← Red chip
│ [Vizualizează] [Șterge]                │
└─────────────────────────────────────────┘

Selected file preview (blue background):
┌─────────────────────────────────────────┐
│ Fișier selectat pentru încărcare        │
│                                         │
│ 📊 materials-list.xlsx (2.45 MB)       │  ← Green chip
│ [Renunță]                              │
└─────────────────────────────────────────┘
```

---

## ⚡ Quick Actions Workflow

### Scenario 1: Quick View
```
User sees: ✅ [Disponibil] [👁️] [⬇️] [✏️]
                              ↑
                          Clicks eye icon
                              ↓
                    File opens in new tab
                         (instant!)
```

### Scenario 2: Download
```
User sees: ✅ [Disponibil] [👁️] [⬇️] [✏️]
                                   ↑
                              Clicks download
                                   ↓
                           File downloads
                         (stays on page!)
```

### Scenario 3: Upload New File
```
User sees: [☁️ Încarcă]  ← Dashed border
              ↓
          Clicks button
              ↓
      Dialog opens with large dropzone
              ↓
      Drags file or clicks "Alege fișier"
              ↓
      File preview appears with icon
              ↓
      Clicks "Încarcă fișa tehnică"
              ↓
      Progress bar → Success → Done!
```

---

## 🎯 Visual States

### 1. Normal State (No File)
```
┌───────────────────┐
│ [☁️ Încarcă]     │  ← Dashed border, white background
└───────────────────┘
```

### 2. Hover State (No File)
```
┌───────────────────┐
│ [☁️ Încarcă]     │  ← Solid border, subtle highlight
└───────────────────┘
```

### 3. File Exists State
```
┌─────────────────────────────────────┐
│ ✅ [Disponibil] [👁️] [⬇️] [✏️]     │  ← Green chip, multiple actions
└─────────────────────────────────────┘
```

### 4. Upload in Progress
```
Dialog shows:
┌─────────────────────────────────────┐
│ Se încarcă fișierul...              │
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░  60%           │  ← Progress bar
└─────────────────────────────────────┘
```

### 5. Drag Active State
```
┌───────────────────────────────────┐
│     ☁️ (HIGHLIGHTED)              │
│                                   │  ← Blue border, blue background
│  Drop your file here!             │
└───────────────────────────────────┘
```

---

## 📏 Size Comparisons

### Upload Zone Size
```
Before:  p: 3  (24px padding)
After:   p: 4  (32px padding)  ← 33% larger!

Before:  Icon 40px
After:   Icon 48px             ← 20% larger!
```

### Column Width
```
Before:  150px
After:   180px                 ← 20% wider for actions
```

### Button Size
```
Before:  Regular button
After:   size="large"          ← Prominent primary action
```

---

## 🎨 Theme Integration

### Color Palette Used
```typescript
Success (Green):
- bgcolor: 'success.50'      // Light green background
- border: 'success.200'       // Green border
- color: 'success'            // Green text/icon

Primary (Blue):
- bgcolor: 'primary.50'       // Light blue background
- border: 'primary.200'       // Blue border
- color: 'primary'            // Blue text/icon

Error (Red):
- Used for PDF file chips

Warning (Orange):
- Used for image file chips

Info (Blue):
- Used for Word document chips
```

---

## ✨ Interactive Elements

### Buttons with Icons
```
View:     [👁️ Vizualizează]     → Success color
Download: [⬇️ Descarcă]          → Primary color
Delete:   [🗑️ Șterge]            → Error color
Replace:  [✏️ Înlocuiește]       → Default color
Upload:   [☁️ Încarcă]           → Dashed border
```

### Tooltips
Every icon button has a tooltip:
- Hover over 👁️ → "Vizualizează fișa tehnică"
- Hover over ⬇️ → "Descarcă fișa tehnică"
- Hover over ✏️ → "Înlocuiește fișa tehnică"

---

## 📱 Responsive Behavior

All elements use `flexWrap="wrap"` to handle small screens:
```
Desktop:
[Disponibil] [👁️] [⬇️] [✏️]  ← All in one row

Mobile:
[Disponibil]
[👁️] [⬇️] [✏️]              ← Wraps to next line
```

---

## 🎯 Summary of Visual Improvements

✅ **More Colorful**: File type colors, semantic chip colors
✅ **More Spacious**: Larger padding, bigger icons
✅ **More Informative**: Icons show file type at a glance
✅ **More Interactive**: Hover effects, multiple quick actions
✅ **More Professional**: Consistent styling, proper hierarchy
✅ **More Accessible**: Tooltips, semantic colors, clear labels

**Result**: A modern, efficient, beautiful file management interface! 🎉
