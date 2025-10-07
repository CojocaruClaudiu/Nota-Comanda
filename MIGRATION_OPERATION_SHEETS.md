# Operation Sheet Templates Migration

Run this migration to add the operation sheet template system to the database.

## Steps:

1. **Generate the migration:**
```bash
cd backend
npx prisma migrate dev --name add-operation-sheet-templates
```

2. **This will:**
   - Create the new tables:
     - `OperationSheetTemplate`
     - `ProjectOperationSheet`
     - `OperationSheetItem`
     - `OperationSheetModification`
   - Add new enum `SheetItemType`
   - Add relations to existing tables

3. **Verify migration:**
```bash
npx prisma studio
```

## Tables Created:

### OperationSheetTemplate
Master templates for operation sheets that can be reused across projects.

### ProjectOperationSheet
Project-specific operation sheets that can be based on templates.

### OperationSheetItem
Individual items (materials, consumables, equipment, labor) in sheets.

### OperationSheetModification
Audit trail of changes made to project sheets.

## After Migration:

1. Regenerate Prisma Client:
```bash
npx prisma generate
```

2. Restart the backend server

3. The new API endpoints will be available at:
   - `GET /api/operation-sheets/operations/:operationId/templates`
   - `POST /api/operation-sheets/operations/:operationId/templates`
   - `PUT /api/operation-sheets/operations/:operationId/templates/:templateId`
   - `DELETE /api/operation-sheets/operations/:operationId/templates/:templateId`
   - `POST /api/operation-sheets/operations/:operationId/templates/:templateId/set-default`
