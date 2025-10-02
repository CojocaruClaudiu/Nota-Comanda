import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
  const { name, description, status, startDate, endDate, budget, clientId, location, currency } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const createData: any = {
      name,
      description,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ? parseFloat(budget) : null,
      clientId,
      location,
    };
    if (currency === 'EUR' || currency === 'RON') createData.currency = currency;

    const project = await prisma.project.create({
      data: createData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
  const { name, description, status, startDate, endDate, budget, clientId, location, currency } = req.body;

    const updateData: any = {
      name,
      description,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ? parseFloat(budget) : null,
      clientId,
      location,
    };
    if (currency === 'EUR' || currency === 'RON') updateData.currency = currency;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ============================================================
// DEVIZ LINES for Projects
// ============================================================

// GET /api/projects/:projectId/deviz - Get all deviz lines for a project
router.get('/:projectId/deviz', async (req, res) => {
  try {
    const { projectId } = req.params;
    const lines = await prisma.projectDevizLine.findMany({
      where: { projectId },
      orderBy: { orderNum: 'asc' },
    });
    res.json(lines);
  } catch (error) {
    console.error('Error fetching deviz lines:', error);
    res.status(500).json({ error: 'Failed to fetch deviz lines' });
  }
});

// POST /api/projects/:projectId/deviz - Create new deviz line
router.post('/:projectId/deviz', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { orderNum, code, description, priceLei, priceEuro, vatPercent, notes } = req.body;

    if (!code || !description) {
      return res.status(400).json({ error: 'Code and description are required' });
    }

    // Calculate prices with VAT
    const vat = vatPercent ? parseFloat(vatPercent) : 0;
    const lei = priceLei ? parseFloat(priceLei) : null;
    const euro = priceEuro ? parseFloat(priceEuro) : null;
    const priceWithVatLei = lei ? lei * (1 + vat / 100) : null;
    const priceWithVatEuro = euro ? euro * (1 + vat / 100) : null;

    const line = await prisma.projectDevizLine.create({
      data: {
        projectId,
        orderNum: orderNum || 1,
        code,
        description,
        priceLei: lei,
        priceEuro: euro,
        vatPercent: vat,
        priceWithVatLei,
        priceWithVatEuro,
        notes,
      },
    });

    res.status(201).json(line);
  } catch (error) {
    console.error('Error creating deviz line:', error);
    res.status(500).json({ error: 'Failed to create deviz line' });
  }
});

// PUT /api/projects/:projectId/deviz/:lineId - Update deviz line
router.put('/:projectId/deviz/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { orderNum, code, description, priceLei, priceEuro, vatPercent, notes } = req.body;

    // Calculate prices with VAT
    const vat = vatPercent !== undefined ? parseFloat(vatPercent) : undefined;
    const lei = priceLei !== undefined ? (priceLei ? parseFloat(priceLei) : null) : undefined;
    const euro = priceEuro !== undefined ? (priceEuro ? parseFloat(priceEuro) : null) : undefined;
    
    let priceWithVatLei = undefined;
    let priceWithVatEuro = undefined;
    
    if (vat !== undefined || lei !== undefined) {
      const currentLine = await prisma.projectDevizLine.findUnique({ where: { id: lineId } });
      const finalVat = vat !== undefined ? vat : (currentLine?.vatPercent || 0);
      const finalLei = lei !== undefined ? lei : currentLine?.priceLei;
      priceWithVatLei = finalLei ? finalLei * (1 + finalVat / 100) : null;
    }
    
    if (vat !== undefined || euro !== undefined) {
      const currentLine = await prisma.projectDevizLine.findUnique({ where: { id: lineId } });
      const finalVat = vat !== undefined ? vat : (currentLine?.vatPercent || 0);
      const finalEuro = euro !== undefined ? euro : currentLine?.priceEuro;
      priceWithVatEuro = finalEuro ? finalEuro * (1 + finalVat / 100) : null;
    }

    const updateData: any = {};
    if (orderNum !== undefined) updateData.orderNum = orderNum;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (lei !== undefined) updateData.priceLei = lei;
    if (euro !== undefined) updateData.priceEuro = euro;
    if (vat !== undefined) updateData.vatPercent = vat;
    if (priceWithVatLei !== undefined) updateData.priceWithVatLei = priceWithVatLei;
    if (priceWithVatEuro !== undefined) updateData.priceWithVatEuro = priceWithVatEuro;
    if (notes !== undefined) updateData.notes = notes;

    const line = await prisma.projectDevizLine.update({
      where: { id: lineId },
      data: updateData,
    });

    res.json(line);
  } catch (error) {
    console.error('Error updating deviz line:', error);
    res.status(500).json({ error: 'Failed to update deviz line' });
  }
});

// DELETE /api/projects/:projectId/deviz/:lineId - Delete deviz line
router.delete('/:projectId/deviz/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;

    await prisma.projectDevizLine.delete({
      where: { id: lineId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting deviz line:', error);
    res.status(500).json({ error: 'Failed to delete deviz line' });
  }
});

// ==================== PROJECT SHEET ROUTES ====================

// GET /api/projects/:projectId/deviz/:lineId/sheet - Fetch project sheet
router.get('/:projectId/deviz/:lineId/sheet', async (req, res) => {
  try {
    const { lineId } = req.params;

    const sheet = await prisma.projectSheet.findUnique({
      where: { devizLineId: lineId },
      include: {
        operations: {
          orderBy: { orderNum: 'asc' }
        }
      }
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Project sheet not found' });
    }

    res.json(sheet);
  } catch (error) {
    console.error('Error fetching project sheet:', error);
    res.status(500).json({ error: 'Failed to fetch project sheet' });
  }
});

// POST /api/projects/:projectId/deviz/:lineId/sheet - Create or update project sheet
router.post('/:projectId/deviz/:lineId/sheet', async (req, res) => {
  try {
    const { projectId, lineId } = req.params;
    const {
      initiationDate,
      estimatedStartDate,
      estimatedEndDate,
      standardMarkupPercent,
      standardDiscountPercent,
      indirectCostsPercent,
      operations
    } = req.body;

    // Upsert project sheet
    const sheet = await prisma.projectSheet.upsert({
      where: { devizLineId: lineId },
      create: {
        projectId,
        devizLineId: lineId,
        initiationDate: initiationDate ? new Date(initiationDate) : null,
        estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
        standardMarkupPercent,
        standardDiscountPercent,
        indirectCostsPercent,
      },
      update: {
        initiationDate: initiationDate ? new Date(initiationDate) : null,
        estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
        standardMarkupPercent,
        standardDiscountPercent,
        indirectCostsPercent,
      }
    });

    // Delete existing operations and recreate them
    if (operations && operations.length > 0) {
      await prisma.projectSheetOperation.deleteMany({
        where: { projectSheetId: sheet.id }
      });

      await prisma.projectSheetOperation.createMany({
        data: operations.map((op: any) => ({
          projectSheetId: sheet.id,
          orderNum: op.orderNum,
          operationName: op.operationName,
          unit: op.unit,
          quantity: op.quantity,
          unitPrice: op.unitPrice,
          totalPrice: op.totalPrice,
          notes: op.notes || null
        }))
      });
    }

    // Fetch the complete sheet with operations
    const completeSheet = await prisma.projectSheet.findUnique({
      where: { id: sheet.id },
      include: {
        operations: {
          orderBy: { orderNum: 'asc' }
        }
      }
    });

    res.json(completeSheet);
  } catch (error) {
    console.error('Error saving project sheet:', error);
    res.status(500).json({ error: 'Failed to save project sheet' });
  }
});

// ==================== DEVIZ MATERIALS ROUTES ====================

// GET /api/projects/:projectId/deviz/:lineId/materials - Fetch materials
router.get('/:projectId/deviz/:lineId/materials', async (req, res) => {
  try {
    const { lineId } = req.params;

    const materials = await prisma.projectDevizMaterial.findMany({
      where: { devizLineId: lineId },
      orderBy: { orderNum: 'asc' }
    });

    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// POST /api/projects/:projectId/deviz/:lineId/materials - Save all materials
router.post('/:projectId/deviz/:lineId/materials', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { materials } = req.body;

    // Delete existing materials
    await prisma.projectDevizMaterial.deleteMany({
      where: { devizLineId: lineId }
    });

    // Create new materials
    if (materials && materials.length > 0) {
      await prisma.projectDevizMaterial.createMany({
        data: materials.map((mat: any) => ({
          devizLineId: lineId,
          orderNum: mat.orderNum,
          operationCode: mat.operationCode,
          operationDescription: mat.operationDescription,
          materialCode: mat.materialCode,
          materialDescription: mat.materialDescription,
          unit: mat.unit,
          quantity: mat.quantity,
          unitPrice: mat.unitPrice,
          baseValue: mat.baseValue,
          markupPercent: mat.markupPercent || null,
          valueWithMarkup: mat.valueWithMarkup,
          discountPercent: mat.discountPercent || null,
          finalValue: mat.finalValue
        }))
      });
    }

    // Fetch and return the saved materials
    const savedMaterials = await prisma.projectDevizMaterial.findMany({
      where: { devizLineId: lineId },
      orderBy: { orderNum: 'asc' }
    });

    res.json(savedMaterials);
  } catch (error) {
    console.error('Error saving materials:', error);
    res.status(500).json({ error: 'Failed to save materials' });
  }
});

// ==================== DEVIZ LABOR ROUTES ====================

// GET /api/projects/:projectId/deviz/:lineId/labor - Fetch labor
router.get('/:projectId/deviz/:lineId/labor', async (req, res) => {
  try {
    const { lineId } = req.params;

    const labor = await prisma.projectDevizLabor.findMany({
      where: { devizLineId: lineId },
      orderBy: { orderNum: 'asc' }
    });

    res.json(labor);
  } catch (error) {
    console.error('Error fetching labor:', error);
    res.status(500).json({ error: 'Failed to fetch labor' });
  }
});

// POST /api/projects/:projectId/deviz/:lineId/labor - Save all labor
router.post('/:projectId/deviz/:lineId/labor', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { labor } = req.body;

    // Delete existing labor
    await prisma.projectDevizLabor.deleteMany({
      where: { devizLineId: lineId }
    });

    // Create new labor
    if (labor && labor.length > 0) {
      await prisma.projectDevizLabor.createMany({
        data: labor.map((lab: any) => ({
          devizLineId: lineId,
          orderNum: lab.orderNum,
          operationCode: lab.operationCode,
          operationDescription: lab.operationDescription,
          laborDescription: lab.laborDescription,
          quantity: lab.quantity,
          unitPrice: lab.unitPrice,
          baseValue: lab.baseValue,
          markupPercent: lab.markupPercent || null,
          valueWithMarkup: lab.valueWithMarkup,
          discountPercent: lab.discountPercent || null,
          finalValue: lab.finalValue
        }))
      });
    }

    // Fetch and return the saved labor
    const savedLabor = await prisma.projectDevizLabor.findMany({
      where: { devizLineId: lineId },
      orderBy: { orderNum: 'asc' }
    });

    res.json(savedLabor);
  } catch (error) {
    console.error('Error saving labor:', error);
    res.status(500).json({ error: 'Failed to save labor' });
  }
});

export default router;
