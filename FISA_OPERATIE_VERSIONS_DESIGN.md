# Fișa Operație - Version & Template System Design

## Overview
A comprehensive system for managing different versions and templates of operation sheets (Fișa Operație), allowing users to:
1. Create and save templates (master versions)
2. Create project-specific variations
3. Track history and changes
4. Switch between versions easily
5. Set a default template

## Data Architecture

### 1. Operation Sheet Template (Master Version)
```typescript
interface OperationSheetTemplate {
  id: string;
  operationId: string; // Reference to the operation
  name: string; // Template name (e.g., "Standard", "Premium", "Budget")
  description?: string;
  isDefault: boolean; // The default template to use
  isActive: boolean;
  
  // Items
  materials: OperationSheetItem[];
  consumables: OperationSheetItem[];
  equipment: OperationSheetItem[];
  labor: OperationSheetItem[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number; // Auto-increment for tracking changes
}
```

### 2. Project-Specific Operation Sheet
```typescript
interface ProjectOperationSheet {
  id: string;
  projectId: string;
  operationId: string;
  templateId?: string; // Reference to the template it was based on
  
  name: string; // Custom name for this project variation
  description?: string;
  
  // Items (can be modified from template)
  materials: OperationSheetItem[];
  consumables: OperationSheetItem[];
  equipment: OperationSheetItem[];
  labor: OperationSheetItem[];
  
  // Tracking
  basedOnTemplateVersion?: number; // Which version of template was used
  modifications: OperationSheetModification[]; // Track what changed
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

### 3. Operation Sheet Item
```typescript
interface OperationSheetItem {
  id: string;
  type: 'material' | 'consumable' | 'equipment' | 'labor';
  
  // Reference data
  referenceId?: string; // ID from materials/equipment/labor tables
  code: string;
  description: string;
  unit: string;
  
  // Quantities and pricing
  quantity: number;
  unitPrice: number;
  totalValue: number;
  
  // Metadata
  addedAt: string;
  addedBy: string;
  notes?: string;
}
```

### 4. Modification Tracking
```typescript
interface OperationSheetModification {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'added' | 'removed' | 'modified' | 'quantity_changed' | 'price_changed';
  itemType: 'material' | 'consumable' | 'equipment' | 'labor';
  itemId: string;
  itemDescription: string;
  
  // Change details
  oldValue?: any;
  newValue?: any;
  
  // For comparison with template
  deviationFromTemplate?: boolean;
}
```

## UI/UX Design

### 1. Template Management Section
Located above the 2x2 grid in FisaOperatieModal:

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Template Management                                          │
├─────────────────────────────────────────────────────────────────┤
│  [Template Dropdown ▼] [+ New Template] [⚙️ Manage]            │
│  Current: Standard (Default) | Last Updated: 2 days ago         │
│  └─ Based on: Standard v3                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Dropdown to switch between templates
- "New Template" creates a copy of current state
- "Manage" opens template management modal
- Shows current template and metadata
- For project-specific sheets, shows which template it's based on

### 2. Template Dropdown Options
```
┌────────────────────────────────────┐
│ 📌 Standard (Default) ✓            │
│ 💰 Budget Version                  │
│ ⭐ Premium Version                 │
│ ─────────────────────────────      │
│ 📁 Project-Specific Versions:      │
│   ├─ Project Alpha - Custom        │
│   ├─ Project Beta - Modified       │
│ ─────────────────────────────      │
│ + Create New Template              │
│ ⚙️  Manage Templates                │
└────────────────────────────────────┘
```

### 3. Template Management Modal
```
┌──────────────────────────────────────────────────────────────┐
│ Template Management - Operation: [Operation Name]            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [Table of Templates]                                         │
│  ┌────────┬─────────────┬─────────┬─────────┬──────────────┐│
│  │ Name   │ Description │ Default │ Items   │ Actions      ││
│  ├────────┼─────────────┼─────────┼─────────┼──────────────┤│
│  │⭐Standard│ Base version│   ✓     │ 24 items│ Edit | Del  ││
│  │💰Budget  │ Cost-saving │         │ 18 items│ Edit | Del  ││
│  │⭐Premium │ High quality│         │ 31 items│ Edit | Del  ││
│  └────────┴─────────────┴─────────┴─────────┴──────────────┘│
│                                                               │
│  [+ Create New Template]                                      │
│                                                               │
│  [Close]                                                      │
└──────────────────────────────────────────────────────────────┘
```

### 4. Version History Panel
Add a collapsible history panel:

```
┌─────────────────────────────────────────────────────────────────┐
│  📜 Version History                              [Expand ▼]     │
├─────────────────────────────────────────────────────────────────┤
│  v5 - Oct 7, 2025 (Current)                                     │
│    └─ Added: Material X, Removed: Equipment Y                   │
│  v4 - Oct 5, 2025                                               │
│    └─ Modified quantities for 3 items                           │
│  v3 - Oct 1, 2025                                               │
│    └─ Initial template creation                                 │
│                                                                  │
│  [View Full History] [Compare Versions]                         │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Project-Specific Modifications Indicator
When viewing a project-specific version, show deviations:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  Modified from Template: Standard v3                        │
│  Changes: +3 materials, -1 equipment, ~2 price changes          │
│  [View Changes] [Revert to Template] [Save as New Template]    │
└─────────────────────────────────────────────────────────────────┘
```

## Backend API Endpoints

### Templates
```typescript
// Template Management
GET    /api/operations/:operationId/templates
POST   /api/operations/:operationId/templates
PUT    /api/operations/:operationId/templates/:templateId
DELETE /api/operations/:operationId/templates/:templateId
POST   /api/operations/:operationId/templates/:templateId/set-default
GET    /api/operations/:operationId/templates/:templateId/history

// Project-Specific Sheets
GET    /api/projects/:projectId/operations/:operationId/sheet
POST   /api/projects/:projectId/operations/:operationId/sheet
PUT    /api/projects/:projectId/operations/:operationId/sheet/:sheetId
POST   /api/projects/:projectId/operations/:operationId/sheet/from-template/:templateId

// Comparison & History
GET    /api/operations/:operationId/templates/:templateId/compare/:otherTemplateId
GET    /api/projects/:projectId/operations/:operationId/sheet/compare-with-template/:templateId
GET    /api/operations/:operationId/templates/:templateId/versions
```

## Database Schema

### operation_sheet_templates
```sql
CREATE TABLE operation_sheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(operation_id, name)
);
```

### project_operation_sheets
```sql
CREATE TABLE project_operation_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  operation_id UUID NOT NULL REFERENCES operations(id),
  template_id UUID REFERENCES operation_sheet_templates(id),
  template_version INTEGER,
  name VARCHAR(255),
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, operation_id)
);
```

### operation_sheet_items
```sql
CREATE TABLE operation_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_type VARCHAR(20) NOT NULL, -- 'template' or 'project'
  sheet_id UUID NOT NULL, -- template_id or project_sheet_id
  item_type VARCHAR(20) NOT NULL, -- 'material', 'consumable', 'equipment', 'labor'
  
  reference_id UUID, -- ID from source table
  code VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_value DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  notes TEXT,
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### operation_sheet_modifications
```sql
CREATE TABLE operation_sheet_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_type VARCHAR(20) NOT NULL,
  sheet_id UUID NOT NULL,
  
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  
  action VARCHAR(50) NOT NULL,
  item_type VARCHAR(20),
  item_id UUID,
  item_description TEXT,
  
  old_value JSONB,
  new_value JSONB,
  deviation_from_template BOOLEAN DEFAULT false
);
```

## User Workflows

### Workflow 1: Creating a Template
1. Open Fișa Operație modal
2. Add materials, consumables, equipment, labor
3. Click "Save as Template"
4. Enter template name and description
5. Choose if it should be default
6. Template is saved and can be reused

### Workflow 2: Using Template in Project
1. Open project
2. Add operation to project
3. Click on operation to open Fișa Operație
4. System loads default template automatically
5. User can modify items as needed
6. Save creates project-specific version
7. Original template remains unchanged

### Workflow 3: Creating Variation
1. Open existing template
2. Modify items (add/remove/change quantities)
3. Click "Save as New Template"
4. Give it a different name (e.g., "Budget Version")
5. New template is created

### Workflow 4: Comparing Versions
1. Open template management
2. Select two templates to compare
3. View side-by-side comparison:
   - Items in A but not B (highlighted green)
   - Items in B but not A (highlighted red)
   - Items in both with different quantities (highlighted yellow)
4. Can merge changes or create hybrid version

### Workflow 5: Reverting Project Changes
1. Open project-specific sheet
2. See "Modified from template" warning
3. Click "View Changes" to see what's different
4. Options:
   - Keep changes
   - Revert to template
   - Update only specific items
   - Save modifications as new template

## Benefits

1. **Reusability** - Create templates once, use many times
2. **Consistency** - Ensure similar projects use same standards
3. **Flexibility** - Project-specific modifications without affecting template
4. **History** - Track all changes over time
5. **Comparison** - Easily see differences between versions
6. **Efficiency** - No need to recreate operation sheets from scratch
7. **Quality Control** - Default templates ensure best practices
8. **Cost Management** - Different templates for different budget levels

## Implementation Priority

### Phase 1 (MVP)
- [ ] Backend database schema
- [ ] Template CRUD operations
- [ ] Basic template selector in UI
- [ ] Save current state as template
- [ ] Load template into modal

### Phase 2
- [ ] Project-specific sheets
- [ ] Modification tracking
- [ ] Template management modal
- [ ] Set default template

### Phase 3
- [ ] Version history
- [ ] Comparison features
- [ ] Deviation indicators
- [ ] Revert functionality

### Phase 4
- [ ] Advanced features:
  - Template inheritance
  - Bulk operations
  - Template export/import
  - Analytics on template usage

---

*Design Document Created: October 7, 2025*
