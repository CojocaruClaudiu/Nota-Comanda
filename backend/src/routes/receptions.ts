import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

function materialToReception(material: any) {
  return {
    id: material.id,
    date: material.purchaseDate ? new Date(material.purchaseDate).toISOString() : '',
    invoice: material.invoiceNumber ?? '',
    supplier: material.supplierName ?? '',
    manufacturer: material.manufacturer ?? '',
    material: material.description ?? material.code ?? '',
    unit: material.unit ?? '',
    quantity: material.receivedQuantity != null ? Number(material.receivedQuantity) : 0,
    unitPrice: material.price != null ? Number(material.price) : 0,
    orderId: null,
    receptionType: material.receptionType ?? null,
    createdAt: material.createdAt ? new Date(material.createdAt).toISOString() : undefined,
    updatedAt: material.updatedAt ? new Date(material.updatedAt).toISOString() : undefined,
  };
}

/**
 * GET /receptions
 * Fetch all receptions
 */
router.get('/', async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      where: {
        OR: [
          { invoiceNumber: { not: null } },
          { receptionType: { not: null } },
          { purchaseDate: { not: null } },
          { receivedQuantity: { not: null } },
        ],
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });
    res.json(materials.map(materialToReception));
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
    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      return res.status(404).json({ error: 'Reception not found' });
    }

    res.json(materialToReception(material));
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
      receptionType,
    } = req.body;

    // Validation
    if (!date || !invoice || !supplier || !manufacturer || !material || !unit || quantity == null || unitPrice == null || !receptionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['SANTIER', 'MAGAZIE'].includes(receptionType)) {
      return res.status(400).json({ error: 'Invalid receptionType. Must be SANTIER or MAGAZIE' });
    }

    const reception = await prisma.material.create({
      data: {
        code: material,
        description: material,
        unit,
        price: parseFloat(unitPrice),
        currency: 'RON',
        supplierName: supplier,
        manufacturer,
        invoiceNumber: invoice,
        purchaseDate: new Date(date),
        receivedQuantity: parseFloat(quantity),
        receptionType,
      },
    });

    res.status(201).json(materialToReception(reception));
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
      receptionType,
    } = req.body;

    // Check if reception exists
    const existing = await prisma.material.findUnique({
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
    if (date !== undefined) updateData.purchaseDate = new Date(date);
    if (invoice !== undefined) updateData.invoiceNumber = invoice;
    if (supplier !== undefined) updateData.supplierName = supplier;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (material !== undefined) {
      updateData.description = material;
      updateData.code = material;
    }
    if (unit !== undefined) updateData.unit = unit;
    if (quantity !== undefined) updateData.receivedQuantity = parseFloat(quantity);
    if (unitPrice !== undefined) updateData.price = parseFloat(unitPrice);
    if (receptionType !== undefined) updateData.receptionType = receptionType;

    const reception = await prisma.material.update({
      where: { id },
      data: updateData,
    });

    res.json(materialToReception(reception));
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
    const existing = await prisma.material.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reception not found' });
    }

    await prisma.material.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting reception:', error);
    res.status(500).json({ error: 'Failed to delete reception' });
  }
});

export default router;
