import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all equipment issues for an employee
router.get('/employees/:employeeId/equipment', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    const equipment = await prisma.equipmentIssue.findMany({
      where: { employeeId },
      orderBy: { issuedDate: 'desc' },
    });
    
    res.json(equipment);
  } catch (error) {
    console.error('Error fetching employee equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// Get active (not returned, not destroyed) equipment for an employee
router.get('/employees/:employeeId/equipment/active', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    const equipment = await prisma.equipmentIssue.findMany({
      where: { 
        employeeId,
        returnedDate: null,
        destroyedDate: null,
      },
      orderBy: { issuedDate: 'desc' },
    });
    
    res.json(equipment);
  } catch (error) {
    console.error('Error fetching active equipment:', error);
    res.status(500).json({ error: 'Failed to fetch active equipment' });
  }
});

// Issue new equipment to employee
router.post('/employees/:employeeId/equipment', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { equipmentType, size, condition, notes, issuedDate } = req.body;
    
    const equipment = await prisma.equipmentIssue.create({
      data: {
        employeeId,
        equipmentType,
        size: size || null,
        condition: condition || 'NEW',
        notes: notes || null,
        issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
      },
    });
    
    res.status(201).json(equipment);
  } catch (error) {
    console.error('Error issuing equipment:', error);
    res.status(500).json({ error: 'Failed to issue equipment' });
  }
});

// ─── STATIC /equipment/* routes MUST come before /equipment/:id ───

// Get equipment summary by type (for inventory management)
router.get('/equipment/summary', async (req: Request, res: Response) => {
  try {
    const summary = await prisma.equipmentIssue.groupBy({
      by: ['equipmentType'],
      where: {
        returnedDate: null,
        destroyedDate: null,
      },
      _count: {
        id: true,
      },
    });
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching equipment summary:', error);
    res.status(500).json({ error: 'Failed to fetch equipment summary' });
  }
});

// Get ALL equipment across all employees (for overview page)
router.get('/equipment/all', async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.equipmentIssue.findMany({
      orderBy: { issuedDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    const normalized = equipment.map((item) => ({
      ...item,
      employee: {
        ...item.employee,
        active: item.employee.isActive,
      },
    }));
    
    res.json(normalized);
  } catch (error) {
    console.error('Error fetching all equipment:', error);
    res.status(500).json({ error: 'Failed to fetch all equipment' });
  }
});

// Get detailed equipment statistics (for charts)
router.get('/equipment/stats', async (req: Request, res: Response) => {
  try {
    const allEquipment = await prisma.equipmentIssue.findMany({
      include: {
        employee: {
          select: { id: true, name: true },
        },
      },
    });

    const totalIssued = allEquipment.length;
    const active = allEquipment.filter(e => !e.returnedDate && !e.destroyedDate).length;
    const returned = allEquipment.filter(e => e.returnedDate).length;
    const destroyed = allEquipment.filter(e => e.destroyedDate).length;

    // By type
    const byType: Record<string, { active: number; returned: number; destroyed: number }> = {};
    allEquipment.forEach(e => {
      if (!byType[e.equipmentType]) byType[e.equipmentType] = { active: 0, returned: 0, destroyed: 0 };
      if (e.destroyedDate) byType[e.equipmentType].destroyed++;
      else if (e.returnedDate) byType[e.equipmentType].returned++;
      else byType[e.equipmentType].active++;
    });

    // By condition (active items only)
    const byCondition: Record<string, number> = {};
    allEquipment.filter(e => !e.returnedDate && !e.destroyedDate).forEach(e => {
      byCondition[e.condition] = (byCondition[e.condition] || 0) + 1;
    });

    // By employee (active items count)
    const byEmployee: Array<{ employeeId: string; employeeName: string; count: number }> = [];
    const empMap: Record<string, { name: string; count: number }> = {};
    allEquipment.filter(e => !e.returnedDate && !e.destroyedDate).forEach(e => {
      if (!empMap[e.employeeId]) empMap[e.employeeId] = { name: e.employee.name, count: 0 };
      empMap[e.employeeId].count++;
    });
    Object.entries(empMap).forEach(([id, val]) => {
      byEmployee.push({ employeeId: id, employeeName: val.name, count: val.count });
    });
    byEmployee.sort((a, b) => b.count - a.count);

    res.json({
      totalIssued,
      active,
      returned,
      destroyed,
      byType,
      byCondition,
      byEmployee,
    });
  } catch (error) {
    console.error('Error fetching equipment stats:', error);
    res.status(500).json({ error: 'Failed to fetch equipment stats' });
  }
});

// ─── PARAMETERIZED /equipment/:id routes AFTER static ones ───

// Update equipment issue (e.g., mark as returned, destroyed, update condition)
router.put('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { returnedDate, destroyedDate, size, condition, notes } = req.body;
    
    const equipment = await prisma.equipmentIssue.update({
      where: { id },
      data: {
        returnedDate: returnedDate ? new Date(returnedDate) : returnedDate === null ? null : undefined,
        destroyedDate: destroyedDate ? new Date(destroyedDate) : destroyedDate === null ? null : undefined,
        size: size !== undefined ? size : undefined,
        condition: condition !== undefined ? condition : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });
    
    res.json(equipment);
  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

// Delete equipment issue
router.delete('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.equipmentIssue.delete({
      where: { id },
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

export default router;
