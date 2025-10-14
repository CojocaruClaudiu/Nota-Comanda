import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /receptions
 * Fetch all receptions
 */
router.get('/', async (req, res) => {
  try {
    const receptions = await prisma.reception.findMany({
      orderBy: {
        date: 'desc',
      },
    });
    res.json(receptions);
  } catch (error) {
    console.error('Error fetching receptions:', error);
    res.status(500).json({ error: 'Failed to fetch receptions' });
  }
});

/**
 * GET /receptions/:id
 * Fetch a single reception by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reception = await prisma.reception.findUnique({
      where: { id },
    });

    if (!reception) {
      return res.status(404).json({ error: 'Reception not found' });
    }

    res.json(reception);
  } catch (error) {
    console.error('Error fetching reception:', error);
    res.status(500).json({ error: 'Failed to fetch reception' });
  }
});

/**
 * POST /receptions
 * Create a new reception
 */
router.post('/', async (req, res) => {
  try {
    const {
      date,
      invoice,
      supplier,
      manufacturer,
      material,
      unit,
      quantity,
      unitPrice,
      orderId,
      receptionType,
    } = req.body;

    // Validation
    if (!date || !invoice || !supplier || !manufacturer || !material || !unit || quantity == null || unitPrice == null || !receptionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['SANTIER', 'MAGAZIE'].includes(receptionType)) {
      return res.status(400).json({ error: 'Invalid receptionType. Must be SANTIER or MAGAZIE' });
    }

    const reception = await prisma.reception.create({
      data: {
        date: new Date(date),
        invoice,
        supplier,
        manufacturer,
        material,
        unit,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        orderId: orderId || null,
        receptionType,
      },
    });

    res.status(201).json(reception);
  } catch (error) {
    console.error('Error creating reception:', error);
    res.status(500).json({ error: 'Failed to create reception' });
  }
});

/**
 * PUT /receptions/:id
 * Update an existing reception
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      invoice,
      supplier,
      manufacturer,
      material,
      unit,
      quantity,
      unitPrice,
      orderId,
      receptionType,
    } = req.body;

    // Check if reception exists
    const existing = await prisma.reception.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reception not found' });
    }

    // Validate receptionType if provided
    if (receptionType && !['SANTIER', 'MAGAZIE'].includes(receptionType)) {
      return res.status(400).json({ error: 'Invalid receptionType. Must be SANTIER or MAGAZIE' });
    }

    const updateData: any = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (invoice !== undefined) updateData.invoice = invoice;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (material !== undefined) updateData.material = material;
    if (unit !== undefined) updateData.unit = unit;
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
    if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice);
    if (orderId !== undefined) updateData.orderId = orderId || null;
    if (receptionType !== undefined) updateData.receptionType = receptionType;

    const reception = await prisma.reception.update({
      where: { id },
      data: updateData,
    });

    res.json(reception);
  } catch (error) {
    console.error('Error updating reception:', error);
    res.status(500).json({ error: 'Failed to update reception' });
  }
});

/**
 * DELETE /receptions/:id
 * Delete a reception
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if reception exists
    const existing = await prisma.reception.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reception not found' });
    }

    await prisma.reception.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting reception:', error);
    res.status(500).json({ error: 'Failed to delete reception' });
  }
});

export default router;
