import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/client-locations - Get all client locations
router.get('/', async (req, res) => {
  try {
    const locations = await prisma.clientLocation.findMany({
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
    res.json(locations);
  } catch (error) {
    console.error('Error fetching client locations:', error);
    res.status(500).json({ error: 'Failed to fetch client locations' });
  }
});

// GET /api/client-locations/:id - Get location by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const location = await prisma.clientLocation.findUnique({
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

    if (!location) {
      return res.status(404).json({ error: 'Client location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error fetching client location:', error);
    res.status(500).json({ error: 'Failed to fetch client location' });
  }
});

// GET /api/client-locations/client/:clientId - Get locations by client ID
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const locations = await prisma.clientLocation.findMany({
      where: { clientId },
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
    res.json(locations);
  } catch (error) {
    console.error('Error fetching client locations:', error);
    res.status(500).json({ error: 'Failed to fetch client locations' });
  }
});

// POST /api/client-locations - Create new client location
router.post('/', async (req, res) => {
  try {
    const { clientId, name, address } = req.body;

    if (!clientId || !name || !address) {
      return res.status(400).json({ error: 'Client ID, name, and address are required' });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const location = await prisma.clientLocation.create({
      data: {
        clientId,
        name,
        address,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating client location:', error);
    res.status(500).json({ error: 'Failed to create client location' });
  }
});

// PUT /api/client-locations/:id - Update client location
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, name, address } = req.body;

    const location = await prisma.clientLocation.update({
      where: { id },
      data: {
        clientId,
        name,
        address,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(location);
  } catch (error) {
    console.error('Error updating client location:', error);
    res.status(500).json({ error: 'Failed to update client location' });
  }
});

// DELETE /api/client-locations/:id - Delete client location
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.clientLocation.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting client location:', error);
    res.status(500).json({ error: 'Failed to delete client location' });
  }
});

export default router;
