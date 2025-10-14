// API routes for Materials and Material Groups
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/technical-sheets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: materialId-timestamp-originalname
    const materialId = req.params.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${materialId}-${timestamp}-${basename}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png/;
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tip de fișier invalid. Permise: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG'));
    }
  }
});

const cleanRequired = (v: any) => {
  const s = String(v || '').trim();
  if (!s) throw new Error('Campo obbligatorio');
  return s;
};

const cleanOptional = (v?: string | null) => {
  const s = String(v || '').trim();
  return s || null;
};

const parsePackQuantity = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
};

const parsePackUnit = (value: unknown): string | null => {
  const s = String(value ?? '').trim();
  return s ? s.toUpperCase() : null;
};

/* ===================== MATERIAL GROUPS ===================== */

type MaterialGroupPayload = {
  name: string;
};

// GET /api/materials/groups
router.get('/groups', async (_req, res) => {
  try {
    const list = await (prisma as any).materialGroup.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (error: unknown) {
    console.error('GET /materials/groups error:', error);
    res.status(500).json({ error: 'Nu am putut încărca grupele de materiale' });
  }
});

// POST /api/materials/groups
router.post('/groups', async (req, res) => {
  const p = (req.body || {}) as MaterialGroupPayload;
  if (!p.name) return res.status(400).json({ error: 'Denumirea este obligatorie' });
  
  try {
    const created = await (prisma as any).materialGroup.create({
      data: { name: cleanRequired(p.name) },
    });
    res.status(201).json(created);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Grupa de materiale există deja' });
    }
    console.error('POST /materials/groups error:', error);
    res.status(500).json({ error: 'Nu am putut crea grupa de materiale' });
  }
});

// PUT /api/materials/groups/:id
router.put('/groups/:id', async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as MaterialGroupPayload;
  if (!p.name) return res.status(400).json({ error: 'Denumirea este obligatorie' });
  
  try {
    const exists = await (prisma as any).materialGroup.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Grupa nu a fost găsită' });
    
    const updated = await (prisma as any).materialGroup.update({
      where: { id },
      data: { name: cleanRequired(p.name) },
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Grupa de materiale există deja' });
    }
    console.error('PUT /materials/groups/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza grupa de materiale' });
  }
});

// DELETE /api/materials/groups/:id
router.delete('/groups/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await (prisma as any).materialGroup.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'Nu se poate șterge: există materiale în această grupă' });
    }
    console.error('DELETE /materials/groups/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge grupa de materiale' });
  }
});

/* ===================== MATERIALS ===================== */

type MaterialPayload = {
  code: string;
  description: string;
  unit?: string | null;
  price?: number | null;
  currency?: 'RON' | 'EUR' | null;
  technicalSheet?: string | null;
  notes?: string | null;
  active?: boolean | null;
};

// GET /api/materials/groups/:groupId/materials
router.get('/groups/:groupId/materials', async (req, res) => {
  const { groupId } = req.params;
  try {
    const materials = await (prisma as any).material.findMany({
      where: { groupId },
      orderBy: [{ code: 'asc' }],
    });
    res.json(materials);
  } catch (error: unknown) {
    console.error('GET /materials/groups/:groupId/materials error:', error);
    res.status(500).json({ error: 'Nu am putut încărca materialele' });
  }
});

// GET /api/materials/unique (one material per product code with enriched data)
router.get('/unique', async (_req, res) => {
  try {
    // Get aggregated data for each unique product code
    const uniqueMaterials = await prisma.$queryRaw`
      WITH latest_materials AS (
        SELECT DISTINCT ON (code) 
          m.id, m."groupId", m.code, m.description, m."supplierName", m."supplierId",
          m.unit, m.price, m.currency, m."purchaseDate", m."technicalSheet", 
          m.notes, m.active, m."packQuantity", m."packUnit", m."createdAt", m."updatedAt"
        FROM "Material" m
        ORDER BY m.code, m."createdAt" DESC
      ),
      material_stats AS (
        SELECT 
          code,
          COUNT(*)::int as "purchaseCount",
          AVG(price)::numeric as "avgPrice",
          MIN(price)::numeric as "minPrice",
          MAX(price)::numeric as "maxPrice",
          array_agg(DISTINCT "supplierName" ORDER BY "supplierName") FILTER (WHERE "supplierName" IS NOT NULL) as suppliers
        FROM "Material"
        GROUP BY code
      )
      SELECT 
        lm.*,
        COALESCE(ms."purchaseCount", 1) as "purchaseCount",
        COALESCE(ms."avgPrice", lm.price) as "avgPrice",
        COALESCE(ms."minPrice", lm.price) as "minPrice",
        COALESCE(ms."maxPrice", lm.price) as "maxPrice",
        ms.suppliers
      FROM latest_materials lm
      LEFT JOIN material_stats ms ON lm.code = ms.code
      ORDER BY lm.code
    `;
    res.json(uniqueMaterials);
  } catch (error: unknown) {
    console.error('GET /materials/unique error:', error);
    res.status(500).json({ error: 'Nu am putut încărca materialele unice' });
  }
});

// GET /api/materials/suppliers - Get list of all unique suppliers
router.get('/suppliers', async (_req, res) => {
  try {
    const suppliers = await prisma.$queryRaw`
      SELECT DISTINCT "supplierName", "supplierId"
      FROM "Material"
      WHERE "supplierName" IS NOT NULL
      ORDER BY "supplierName"
    `;
    res.json(suppliers);
  } catch (error: unknown) {
    console.error('GET /materials/suppliers error:', error);
    res.status(500).json({ error: 'Nu am putut încărca lista de furnizori' });
  }
});

// GET /api/materials/history/:code - Get price history for a specific product code
router.get('/history/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const materials = await (prisma as any).material.findMany({
      where: { code },
      orderBy: [{ price: 'desc' }],
    });
    res.json(materials);
  } catch (error: unknown) {
    console.error('GET /materials/history/:code error:', error);
    res.status(500).json({ error: 'Nu am putut încărca istoricul prețurilor' });
  }
});

// GET /api/materials (all materials - for price history)
router.get('/', async (_req, res) => {
  try {
    const materials = await (prisma as any).material.findMany({
      include: { group: { select: { name: true } } },
      orderBy: [{ code: 'asc' }],
    });
    res.json(materials);
  } catch (error: unknown) {
    console.error('GET /materials error:', error);
    res.status(500).json({ error: 'Nu am putut încărca materialele' });
  }
});

// GET /api/materials/groups-with-materials
router.get('/groups-with-materials', async (_req, res) => {
  try {
    const groups = await (prisma as any).materialGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        materials: {
          orderBy: [{ code: 'asc' }],
        },
      },
    });
    res.json(groups);
  } catch (error: unknown) {
    console.error('GET /materials/groups-with-materials error:', error);
    res.status(500).json({ error: 'Nu am putut încărca datele' });
  }
});

// POST /api/materials - Create material without group
router.post('/', async (req, res) => {
  const p = (req.body || {}) as MaterialPayload;
  
  if (!p.code || !p.description) {
    return res.status(400).json({ error: 'Codul și descrierea sunt obligatorii' });
  }
  
  try {
    const created = await (prisma as any).material.create({
      data: {
        groupId: null,  // No group
        code: cleanRequired(p.code),
        description: cleanRequired(p.description),
        unit: cleanOptional(p.unit) ?? 'buc',
        price: p.price != null ? Number(p.price) : 0,
        currency: (p.currency as any) ?? 'RON',
        technicalSheet: cleanOptional(p.technicalSheet),
        notes: cleanOptional(p.notes),
        active: p.active == null ? true : Boolean(p.active),
        packQuantity: parsePackQuantity(p.packQuantity),
        packUnit: parsePackUnit(p.packUnit),
      },
    });
    res.status(201).json(created);
  } catch (error: any) {
    console.error('POST /materials error:', error);
    res.status(500).json({ error: 'Nu am putut crea materialul' });
  }
});

// POST /api/materials/groups/:groupId/materials
router.post('/groups/:groupId/materials', async (req, res) => {
  const { groupId } = req.params;
  const p = (req.body || {}) as MaterialPayload;
  
  if (!p.code || !p.description) {
    return res.status(400).json({ error: 'Codul și descrierea sunt obligatorii' });
  }
  
  try {
    const created = await (prisma as any).material.create({
      data: {
        groupId,
        code: cleanRequired(p.code),
        description: cleanRequired(p.description),
        unit: cleanOptional(p.unit) ?? 'buc',
        price: p.price != null ? Number(p.price) : 0,
        currency: (p.currency as any) ?? 'RON',
        technicalSheet: cleanOptional(p.technicalSheet),
        notes: cleanOptional(p.notes),
        active: p.active == null ? true : Boolean(p.active),
        packQuantity: parsePackQuantity(p.packQuantity),
        packUnit: parsePackUnit(p.packUnit),
      },
    });
    res.status(201).json(created);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Material duplicat' });
    }
    console.error('POST /materials/groups/:groupId/materials error:', error);
    res.status(500).json({ error: 'Nu am putut crea materialul' });
  }
});

// PUT /api/materials/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as MaterialPayload;
  
  if (!p.code || !p.description) {
    return res.status(400).json({ error: 'Codul și descrierea sunt obligatorii' });
  }
  
  try {
    const packQuantityValue =
      p.packQuantity !== undefined ? parsePackQuantity(p.packQuantity) : undefined;
    const packUnitValue =
      p.packUnit !== undefined ? parsePackUnit(p.packUnit) : undefined;

    const updateData: any = {
      code: cleanRequired(p.code),
      description: cleanRequired(p.description),
      unit: cleanOptional(p.unit) ?? 'buc',
      price: p.price != null ? Number(p.price) : 0,
      currency: (p.currency as any) ?? 'RON',
      technicalSheet: cleanOptional(p.technicalSheet),
      notes: cleanOptional(p.notes),
      active: p.active == null ? true : Boolean(p.active),
    };

    if (packQuantityValue !== undefined) updateData.packQuantity = packQuantityValue;
    if (packUnitValue !== undefined) updateData.packUnit = packUnitValue;

    const updated = await (prisma as any).material.update({
      where: { id },
      data: updateData,
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Material duplicat' });
    }
    console.error('PUT /materials/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza materialul' });
  }
});

// POST /api/materials/:id/upload-sheet - Upload technical sheet
router.post('/:id/upload-sheet', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  
  if (!req.file) {
    return res.status(400).json({ error: 'Niciun fișier încărcat' });
  }
  
  try {
    // Delete old file if exists
    const material = await (prisma as any).material.findUnique({ where: { id } });
    if (material?.technicalSheet) {
      const oldFilePath = path.join(__dirname, '../../uploads/technical-sheets', path.basename(material.technicalSheet));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // Update material with new file path
    const filePath = `/uploads/technical-sheets/${req.file.filename}`;
    const updated = await (prisma as any).material.update({
      where: { id },
      data: { technicalSheet: filePath }
    });
    
    res.json(updated);
  } catch (error: unknown) {
    console.error('POST /materials/:id/upload-sheet error:', error);
    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Eroare la încărcarea fișierului' });
  }
});

// DELETE /api/materials/:id/technical-sheet - Delete technical sheet
router.delete('/:id/technical-sheet', async (req, res) => {
  const { id } = req.params;
  
  try {
    const material = await (prisma as any).material.findUnique({ where: { id } });
    
    if (material?.technicalSheet) {
      const filePath = path.join(__dirname, '../../uploads/technical-sheets', path.basename(material.technicalSheet));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await (prisma as any).material.update({
      where: { id },
      data: { technicalSheet: null }
    });
    
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /materials/:id/technical-sheet error:', error);
    res.status(500).json({ error: 'Eroare la ștergerea fișierului' });
  }
});

// GET /api/materials/:id/download-sheet - Download technical sheet
router.get('/:id/download-sheet', async (req, res) => {
  const { id } = req.params;
  
  try {
    const material = await (prisma as any).material.findUnique({ where: { id } });
    
    if (!material?.technicalSheet) {
      return res.status(404).json({ error: 'Fișierul nu există' });
    }
    
    const filePath = path.join(__dirname, '../../uploads/technical-sheets', path.basename(material.technicalSheet));
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fișierul nu a fost găsit pe server' });
    }
    
    res.download(filePath);
  } catch (error: unknown) {
    console.error('GET /materials/:id/download-sheet error:', error);
    res.status(500).json({ error: 'Eroare la descărcarea fișierului' });
  }
});

// DELETE /api/materials/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete technical sheet file if exists
    const material = await (prisma as any).material.findUnique({ where: { id } });
    if (material?.technicalSheet) {
      const filePath = path.join(__dirname, '../../uploads/technical-sheets', path.basename(material.technicalSheet));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await (prisma as any).material.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /materials/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge materialul' });
  }
});

export default router;
