import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET all offers (with pagination)
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;

    const where = status ? { status: status as any } : {};

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.offer.count({ where }),
    ]);

    res.json({ offers, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

// GET single offer by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    res.json(offer);
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ error: "Failed to fetch offer" });
  }
});

// CREATE new offer
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      clientName,
      clientAddress,
      clientRegCom,
      clientCif,
      issueDate,
      validUntil,
      notes,
      includeVat,
      vatRate,
      currency,
      items,
    } = req.body;

    // Calculate grand total
    const grandTotal = items?.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) || 0;

    const offer = await prisma.offer.create({
      data: {
        name,
        clientName,
        clientAddress,
        clientRegCom,
        clientCif,
        issueDate: new Date(issueDate),
        validUntil: new Date(validUntil),
        notes,
        includeVat: includeVat || false,
        vatRate: vatRate || 19,
        currency: currency || "EUR",
        grandTotal,
        items: {
          create: items?.map((item: any, idx: number) => ({
            sortOrder: idx,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            observations: item.observations || "",
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
          })) || [],
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    res.status(201).json(offer);
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ error: "Failed to create offer" });
  }
});

// UPDATE offer
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const {
      name,
      clientName,
      clientAddress,
      clientRegCom,
      clientCif,
      issueDate,
      validUntil,
      notes,
      includeVat,
      vatRate,
      currency,
      status,
      items,
    } = req.body;

    // Calculate grand total
    const grandTotal = items?.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) || 0;

    // Delete existing items and recreate
    await prisma.offerItem.deleteMany({ where: { offerId: req.params.id } });

    const offer = await prisma.offer.update({
      where: { id: req.params.id },
      data: {
        name,
        clientName,
        clientAddress,
        clientRegCom,
        clientCif,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        notes,
        includeVat,
        vatRate,
        currency,
        status,
        grandTotal,
        items: {
          create: items?.map((item: any, idx: number) => ({
            sortOrder: idx,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            observations: item.observations || "",
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
          })) || [],
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    res.json(offer);
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ error: "Failed to update offer" });
  }
});

// DELETE offer
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.offer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ error: "Failed to delete offer" });
  }
});

// PATCH offer status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const offer = await prisma.offer.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(offer);
  } catch (error) {
    console.error("Error updating offer status:", error);
    res.status(500).json({ error: "Failed to update offer status" });
  }
});

export default router;
