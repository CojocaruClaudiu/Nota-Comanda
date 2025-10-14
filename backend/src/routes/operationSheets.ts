import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import type {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  OperationSheetTemplateDTO,
} from '../types/operationSheet';

const router = Router();
const prisma = new PrismaClient();

// ==================== TEMPLATE ENDPOINTS ====================

// Get all templates for an operation item
router.get('/operations/:operationId/templates', async (req, res) => {
  try {
    const { operationId } = req.params;

    const templates = await prisma.operationSheetTemplate.findMany({
      where: {
        operationItemId: operationId,
        isActive: true,
      },
      include: {
        items: {
          orderBy: { addedAt: 'asc' },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    const templatesDTO: OperationSheetTemplateDTO[] = templates.map((template) => ({
      id: template.id,
      operationId: template.operationItemId,
      name: template.name,
      description: template.description || undefined,
      isDefault: template.isDefault,
      isActive: template.isActive,
      version: template.version,
      items: template.items.map((item) => ({
        id: item.id,
        itemType: item.itemType as any,
        referenceId: item.referenceId || undefined,
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: item.notes || undefined,
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }));

    res.json(templatesDTO);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get a single template by ID
router.get('/operations/:operationId/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await prisma.operationSheetTemplate.findUnique({
      where: { id: templateId },
      include: {
        items: {
          orderBy: { addedAt: 'asc' },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const templateDTO: OperationSheetTemplateDTO = {
      id: template.id,
      operationId: template.operationItemId,
      name: template.name,
      description: template.description || undefined,
      isDefault: template.isDefault,
      isActive: template.isActive,
      version: template.version,
      items: template.items.map((item) => ({
        id: item.id,
        itemType: item.itemType as any,
        referenceId: item.referenceId || undefined,
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: item.notes || undefined,
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };

    res.json(templateDTO);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create a new template
router.post('/operations/:operationId/templates', async (req, res) => {
  try {
    const { operationId } = req.params;
    const body: CreateTemplateRequest = req.body;

    // If setting as default, unset other defaults first
    if (body.isDefault) {
      await prisma.operationSheetTemplate.updateMany({
        where: {
          operationItemId: operationId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const template = await prisma.operationSheetTemplate.create({
      data: {
        operationItemId: operationId,
        name: body.name,
        description: body.description,
        isDefault: body.isDefault || false,
        isActive: true,
        version: 1,
        items: {
          create: body.items.map((item: any) => {
            const price = item.price ?? item.unitPrice;
            if (price === undefined || price === null) {
              throw new Error(`Item price is required for item: ${JSON.stringify(item)}`);
            }
            return {
              itemType: item.type || item.itemType,
              referenceId: item.referenceId || null,
              code: item.code || '',
              description: item.description || item.name || '',
              unit: item.unit,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(price),
              notes: item.notes || null,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });

    const templateDTO: OperationSheetTemplateDTO = {
      id: template.id,
      operationId: template.operationItemId,
      name: template.name,
      description: template.description || undefined,
      isDefault: template.isDefault,
      isActive: template.isActive,
      version: template.version,
      items: template.items.map((item) => ({
        id: item.id,
        itemType: item.itemType as any,
        referenceId: item.referenceId || undefined,
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: item.notes || undefined,
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };

    res.status(201).json(templateDTO);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update a template
router.put('/operations/:operationId/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const body: UpdateTemplateRequest = req.body;

    // If setting as default, unset other defaults first
    if (body.isDefault) {
      const template = await prisma.operationSheetTemplate.findUnique({
        where: { id: templateId },
      });

      if (template) {
        await prisma.operationSheetTemplate.updateMany({
          where: {
            operationItemId: template.operationItemId,
            isDefault: true,
            id: { not: templateId },
          },
          data: {
            isDefault: false,
          },
        });
      }
    }

    // If items are provided, replace all items
    if (body.items) {
      await prisma.operationSheetItem.deleteMany({
        where: { templateId },
      });
    }

    const updatedTemplate = await prisma.operationSheetTemplate.update({
      where: { id: templateId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        version: { increment: 1 },
        ...(body.items && {
          items: {
            create: body.items.map((item: any) => {
              const price = item.price ?? item.unitPrice;
              if (price === undefined || price === null) {
                throw new Error(`Item price is required for item: ${JSON.stringify(item)}`);
              }
              return {
                itemType: item.type || item.itemType,
                referenceId: item.referenceId || null,
                code: item.code || '',
                description: item.description || item.name || '',
                unit: item.unit,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: new Prisma.Decimal(price),
                notes: item.notes || null,
              };
            }),
          },
        }),
      },
      include: {
        items: true,
      },
    });

    const templateDTO: OperationSheetTemplateDTO = {
      id: updatedTemplate.id,
      operationId: updatedTemplate.operationItemId,
      name: updatedTemplate.name,
      description: updatedTemplate.description || undefined,
      isDefault: updatedTemplate.isDefault,
      isActive: updatedTemplate.isActive,
      version: updatedTemplate.version,
      items: updatedTemplate.items.map((item) => ({
        id: item.id,
        itemType: item.itemType as any,
        referenceId: item.referenceId || undefined,
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: item.notes || undefined,
      })),
      createdAt: updatedTemplate.createdAt.toISOString(),
      updatedAt: updatedTemplate.updatedAt.toISOString(),
    };

    res.json(templateDTO);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a template (soft delete by setting isActive to false)
router.delete('/operations/:operationId/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    await prisma.operationSheetTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Set a template as default
router.post('/operations/:operationId/templates/:templateId/set-default', async (req, res) => {
  try {
    const { operationId, templateId } = req.params;

    // Unset all other defaults
    await prisma.operationSheetTemplate.updateMany({
      where: {
        operationItemId: operationId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this one as default
    const template = await prisma.operationSheetTemplate.update({
      where: { id: templateId },
      data: { isDefault: true },
      include: {
        items: true,
      },
    });

    const templateDTO: OperationSheetTemplateDTO = {
      id: template.id,
      operationId: template.operationItemId,
      name: template.name,
      description: template.description || undefined,
      isDefault: template.isDefault,
      isActive: template.isActive,
      version: template.version,
      items: template.items.map((item) => ({
        id: item.id,
        itemType: item.itemType as any,
        referenceId: item.referenceId || undefined,
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: item.notes || undefined,
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };

    res.json(templateDTO);
  } catch (error) {
    console.error('Error setting default template:', error);
    res.status(500).json({ error: 'Failed to set default template' });
  }
});

// ==================== PROJECT OPERATION SHEET ENDPOINTS ====================

// Get operation sheet for a specific project and operation (accepts Operation OR OperationItem id)
router.get('/projects/:projectId/operations/:operationId/sheet', async (req, res) => {
  try {
    const { projectId, operationId: rawOperationId } = req.params;

    const resolved = await resolveOperationContext(rawOperationId);
    if (!resolved) {
      return res.status(404).json({ error: 'Operation or operation item not found' });
    }
    const { operationId, operationItemId } = resolved;

    const sheet = await prisma.projectOperationSheet.findUnique({
      where: {
        projectId_operationId: {
          projectId,
          operationId,
        },
      },
      include: {
        items: { orderBy: { addedAt: 'asc' } },
        template: true,
      },
    });

    if (!sheet) {
      return res.json({
        id: null,
        projectId,
        operationId,
        operationItemId,
        templateId: null,
        items: [],
      });
    }

    res.json({
      id: sheet.id,
      projectId: sheet.projectId,
      operationId: sheet.operationId,
      operationItemId,
      templateId: sheet.templateId,
      templateVersion: sheet.templateVersion,
      name: sheet.name,
      description: sheet.description,
      items: sheet.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        referenceId: item.referenceId,
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        addedAt: item.addedAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      createdAt: sheet.createdAt.toISOString(),
      updatedAt: sheet.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching project operation sheet:', error);
    res.status(500).json({ error: 'Failed to fetch operation sheet' });
  }
});

// Helper to resolve provided ID (could be an Operation ID or an OperationItem ID)
async function resolveOperationContext(
  rawId: string
): Promise<{ operationItemId: string; operationId: string; source: 'operation' | 'item' } | null> {
  // If rawId is already an OperationItem ID
  const item = await prisma.operationItem.findUnique({ where: { id: rawId } });
  if (item) {
    return {
      operationItemId: item.id,
      operationId: item.operationId,
      source: 'item',
    };
  }

  // Otherwise try to resolve it as an Operation ID by picking its latest item
  const op = await prisma.operation.findUnique({
    where: { id: rawId },
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (op?.items?.length) {
    const latestItem = op.items[0];
    return {
      operationItemId: latestItem.id,
      operationId: op.id,
      source: 'operation',
    };
  }

  return null;
}

// Save operation sheet for a specific project and operation (accepts Operation OR OperationItem id in :operationId)
router.post('/projects/:projectId/operations/:operationId/sheet', async (req, res) => {
  try {
    const { projectId, operationId: rawOperationId } = req.params;
    const { templateId, items, name, description } = req.body;

    // Resolve to actual operation id (FK)
    const resolved = await resolveOperationContext(rawOperationId);
    if (!resolved) {
      return res.status(404).json({ error: 'Operation or operation item not found' });
    }
    const { operationId, operationItemId, source } = resolved;
    console.log('Saving project operation sheet', { projectId, operationId, operationItemId, source });

    // Validate items
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    // Upsert the project operation sheet (one per project+operation for now)
    const sheet = await prisma.projectOperationSheet.upsert({
      where: {
        projectId_operationId: {
          projectId,
          operationId,
        },
      },
      create: {
        projectId,
        operationId,
        templateId: templateId || null,
        name: name || null,
        description: description || null,
      },
      update: {
        templateId: templateId || null,
        name: name || null,
        description: description || null,
      },
    });

    // Delete existing items
    await prisma.operationSheetItem.deleteMany({
      where: {
        projectSheetId: sheet.id,
      },
    });

    // Create new items
    if (items.length > 0) {
      await prisma.operationSheetItem.createMany({
        data: items.map((item: any) => {
          const price = item.price !== undefined ? item.price : item.unitPrice;
          if (price === undefined || price === null) {
            throw new Error(`Item "${item.code}" is missing price. Item: ${JSON.stringify(item)}`);
          }
          const quantity = item.quantity ?? 0;
          
          return {
            projectSheetId: sheet.id,
            itemType: item.type || item.itemType,
            referenceId: item.referenceId || null,
            code: item.code || '',
            description: item.description || item.name || '',
            unit: item.unit,
            quantity: new Prisma.Decimal(quantity),
            unitPrice: new Prisma.Decimal(price), // Allow 0 price
          };
        }),
      });
    }

    // Fetch the complete sheet with items
    const completeSheet = await prisma.projectOperationSheet.findUnique({
      where: { id: sheet.id },
      include: {
        items: { orderBy: { addedAt: 'asc' } },
      },
    });

    res.json({
      id: completeSheet!.id,
      projectId: completeSheet!.projectId,
      operationId: completeSheet!.operationId,
      operationItemId,
      templateId: completeSheet!.templateId,
      items: completeSheet!.items.map((item: any) => ({
        id: item.id,
        itemType: item.itemType,
        referenceId: item.referenceId,
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        addedAt: item.addedAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      createdAt: completeSheet!.createdAt.toISOString(),
      updatedAt: completeSheet!.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error saving project operation sheet:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';
    res.status(500).json({ error: 'Failed to save operation sheet', details: message });
  }
});

export default router;
