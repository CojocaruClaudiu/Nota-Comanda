// src/index.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from "./auth/authRoutes";
import projectRoutes from "./routes/projects";
import clientLocationRoutes from "./routes/clientLocations";

const prisma = new PrismaClient({ log: ['warn', 'error'] });
const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/client-locations", clientLocationRoutes);

/** Helpers */
const cleanRequired = (v: unknown): string => String(v ?? '').trim();
const cleanOptional = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : null; // empty -> null so UNIQUE allows multiples
};
const toDate = (v: unknown): Date => new Date(String(v));

// Error handling utility
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
};

// Prisma error checking utility
const isPrismaError = (error: unknown): error is { code: string; message: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
};
function fullYearsBetween(start: Date, ref = new Date()): number {
  let years = ref.getFullYear() - start.getFullYear();
  const anniversaryThisYear = new Date(ref.getFullYear(), start.getMonth(), start.getDate());
  if (ref < anniversaryThisYear) years -= 1;
  return Math.max(0, years);
}
function entitledDays(hiredAt: Date, ref = new Date()): number {
  const yrs = fullYearsBetween(hiredAt, ref);
  return 21 + Math.floor(yrs / 5);
}
function ageFrom(birth: Date | null | undefined, ref = new Date()): number | null {
  if (!birth) return null;
  let years = ref.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(ref.getFullYear(), birth.getMonth(), birth.getDate());
  if (ref < birthdayThisYear) years -= 1;
  return Math.max(0, years);
}

/** Ping */
app.get('/ping', (_req, res) => res.json({ pong: true }));

/* ===================== CLIENTS ===================== */

/** List clients */
app.get('/clients', async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (error: unknown) {
    console.error('GET /clients error:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to fetch clients' });
  }
});

/** Create client (registrulComertului & cui OPTIONAL) */
app.post('/clients', async (req, res) => {
  try {
    const { name, location, phone, registrulComertului, cui, email } = req.body || {};

    if (!name || !location) {
      return res
        .status(400)
        .json({ error: 'Nume și Locație sunt obligatorii' });
    }

    const client = await prisma.client.create({
      data: {
        name: cleanRequired(name),
        location: cleanRequired(location),
        phone: cleanOptional(phone) ?? '',
        registrulComertului: cleanOptional(registrulComertului),
        cui: cleanOptional(cui),
        email: cleanOptional(email),
      },
    });
    res.status(201).json(client);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'CUI sau Registrul Comerțului este deja folosit.' });
    }
    console.error('POST /clients error:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to create client' });
  }
});

/** Update client (registrulComertului & cui OPTIONAL) */
app.put('/clients/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, phone, registrulComertului, cui, email } = req.body || {};

  if (!name || !location) {
    return res
      .status(400)
      .json({ error: 'Nume și Locație sunt obligatorii' });
  }

  try {
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Clientul nu a fost găsit' });

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: cleanRequired(name),
        location: cleanRequired(location),
        phone: cleanOptional(phone) ?? '',
        registrulComertului: cleanOptional(registrulComertului),
        cui: cleanOptional(cui),
        email: cleanOptional(email),
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'CUI sau Registrul Comerțului este deja folosit.' });
    }
    console.error('PUT /clients/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza clientul' });
  }
});

/** Delete client */
app.delete('/clients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await prisma.client.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Clientul nu a fost găsit' });

    await prisma.client.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /clients/:id error:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Nu am putut șterge clientul' });
  }
});

/* ===================== ECHIPA (Employees & Leave) ===================== */

type EmployeePayload = {
  name: string;
  qualifications?: string[];
  hiredAt: string;            // ISO date
  birthDate?: string | null;  // ISO, optional
};
type LeavePayload = {
  startDate: string; // ISO date for start
  days: number;      // positive integer
  note?: string;
};

/** GET /employees  -> list with computed {entitledDays, takenDays, remainingDays} for current year */
app.get('/employees', async (_req, res) => {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

    const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });

    const sums = await prisma.leave.groupBy({
      by: ['employeeId'],
      where: { startDate: { gte: yearStart, lt: yearEnd } },
      _sum: { days: true },
    });

    const takenMap = new Map<string, number>();
    for (const s of sums) takenMap.set(s.employeeId, s._sum.days ?? 0);

    const result = employees.map(e => {
      const ent = entitledDays(e.hiredAt, now);
      const taken = takenMap.get(e.id) ?? 0;
      const remaining = Math.max(0, ent - taken);
  const age = ageFrom(e.birthDate, now);
      return { ...e, entitledDays: ent, takenDays: taken, remainingDays: remaining, age };
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('GET /employees error:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Nu am putut încărca echipa' });
  }
});

/** POST /employees */
app.post('/employees', async (req, res) => {
  try {
    const { name, qualifications = [], hiredAt } = (req.body || {}) as EmployeePayload;
    if (!name || !hiredAt) {
      return res.status(400).json({ error: 'Nume și Data angajării sunt obligatorii' });
    }
    const created = await prisma.employee.create({
      data: {
        name: cleanRequired(name),
        qualifications: Array.isArray(qualifications)
          ? qualifications.map(q => String(q).trim()).filter(Boolean)
          : [],
        hiredAt: toDate(hiredAt),
  birthDate: req.body?.birthDate ? toDate(req.body.birthDate) : null,
      },
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    console.error('POST /employees error:', error);
    res.status(500).json({ error: 'Nu am putut crea angajatul' });
  }
});

/** PUT /employees/:id */
app.put('/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { name, qualifications = [], hiredAt } = (req.body || {}) as EmployeePayload;
    if (!name || !hiredAt) {
      return res.status(400).json({ error: 'Nume și Data angajării sunt obligatorii' });
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Angajatul nu a fost găsit' });

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        name: cleanRequired(name),
        qualifications: Array.isArray(qualifications)
          ? qualifications.map(q => String(q).trim()).filter(Boolean)
          : [],
        hiredAt: toDate(hiredAt),
  birthDate: req.body?.birthDate ? toDate(req.body.birthDate) : null,
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error('PUT /employees/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza angajatul' });
  }
});

/** DELETE /employees/:id */
app.delete('/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Angajatul nu a fost găsit' });

    await prisma.employee.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /employees/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge angajatul' });
  }
});

/** POST /employees/:id/leaves  (add paid leave record) */
app.post('/employees/:id/leaves', async (req, res) => {
  const { id } = req.params;
  try {
    const { startDate, days, note } = (req.body || {}) as LeavePayload;
    if (!startDate || !Number.isFinite(days) || days <= 0) {
      return res.status(400).json({ error: 'Data începerii și numărul de zile (>0) sunt obligatorii' });
    }
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp) return res.status(404).json({ error: 'Angajatul nu a fost găsit' });

    const created = await prisma.leave.create({
      data: {
        employeeId: id,
        startDate: toDate(startDate),
        days: Math.floor(days),
        note: cleanOptional(note),
      },
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    console.error('POST /employees/:id/leaves error:', error);
    res.status(500).json({ error: 'Nu am putut înregistra concediul' });
  }
});

/** GET /employees/:id/leaves  (history) */
app.get('/employees/:id/leaves', async (req, res) => {
  const { id } = req.params;
  try {
    const leaves = await prisma.leave.findMany({
      where: { employeeId: id },
      orderBy: { startDate: 'desc' },
    });
    res.json(leaves);
  } catch (error: unknown) {
    console.error('GET /employees/:id/leaves error:', error);
    res.status(500).json({ error: 'Nu am putut încărca istoricul concediilor' });
  }
});

/** DELETE /leaves/:leaveId */
app.delete('/leaves/:leaveId', async (req, res) => {
  const { leaveId } = req.params;
  try {
    await prisma.leave.delete({ where: { id: leaveId } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /leaves/:leaveId error:', error);
    res.status(500).json({ error: 'Nu am putut șterge înregistrarea de concediu' });
  }
});

// --- CAR ROUTES -------------------------------------------------------------
type CarPayload = {
  vin: string;
  marca: string;
  model: string;
  an: number;
  culoare?: string | null;
  placute: string;
  driverId?: string | null;
  driverNote?: string | null;
  combustibil?: import('@prisma/client').FuelType | null;
  expItp?: string | null;  // 'YYYY-MM-DD' or ISO
  expRca?: string | null;
  expRovi?: string | null;
};

// helpers
const s = (v: unknown) => String(v ?? '').trim();
const opt = (v: unknown) => {
  const val = typeof v === 'string' ? v.trim() : '';
  return val ? val : null;
};
const optInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const optDate = (v: unknown): Date | null => {
  const str = typeof v === 'string' ? v.trim() : '';
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

// GET /cars
app.get('/cars', async (_req, res) => {
  try {
    const cars = await prisma.car.findMany({
      include: { driver: { select: { id: true, name: true } } },
      orderBy: [{ updatedAt: 'desc' }],
    });
    res.json(cars);
  } catch (error: unknown) {
    console.error('GET /cars error:', error);
    res.status(500).json({ error: 'Nu am putut încărca mașinile' });
  }
});

// POST /cars
app.post('/cars', async (req, res) => {
  try {
    const p: CarPayload = req.body || {};

    if (!p.vin || !p.marca || !p.model || !p.placute || !p.an) {
      return res.status(400).json({ error: 'VIN, Marcă, Model, Plăcuțe și An sunt obligatorii' });
    }

    const created = await prisma.car.create({
      data: {
        vin: s(p.vin),
        marca: s(p.marca),
        model: s(p.model),
        an: Number(p.an),
        culoare: opt(p.culoare),
        placute: s(p.placute).toUpperCase(),
        driverId: opt(p.driverId),
        driverNote: opt(p.driverNote),
        combustibil: p.combustibil ?? null,
        expItp: optDate(p.expItp),
        expRca: optDate(p.expRca),
        expRovi: optDate(p.expRovi),
      },
      include: { driver: { select: { id: true, name: true } } },
    });

    res.status(201).json(created);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === 'P2002') {
      // unique vin or placute
      return res.status(409).json({ error: 'VIN sau plăcuțele sunt deja folosite' });
    }
    console.error('POST /cars error:', error);
    res.status(500).json({ error: 'Nu am putut crea mașina' });
  }
});

// PUT /cars/:id
app.put('/cars/:id', async (req, res) => {
  const { id } = req.params;
  const p: CarPayload = req.body || {};

  if (!p.vin || !p.marca || !p.model || !p.placute || !p.an) {
    return res.status(400).json({ error: 'VIN, Marcă, Model, Plăcuțe și An sunt obligatorii' });
  }

  try {
    const exists = await prisma.car.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Mașina nu a fost găsită' });

    const updated = await prisma.car.update({
      where: { id },
      data: {
        vin: s(p.vin),
        marca: s(p.marca),
        model: s(p.model),
        an: Number(p.an),
        culoare: opt(p.culoare),
        placute: s(p.placute).toUpperCase(),
        driverId: opt(p.driverId),
        driverNote: opt(p.driverNote),
        combustibil: p.combustibil ?? null,
        expItp: optDate(p.expItp),
        expRca: optDate(p.expRca),
        expRovi: optDate(p.expRovi),
      },
      include: { driver: { select: { id: true, name: true } } },
    });

    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === 'P2002') {
      return res.status(409).json({ error: 'VIN sau plăcuțele sunt deja folosite' });
    }
    console.error('PUT /cars/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza mașina' });
  }
});

// DELETE /cars/:id
app.delete('/cars/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await prisma.car.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Mașina nu a fost găsită' });

    await prisma.car.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /cars/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge mașina' });
  }
});

/* ===================== FURNIZORI (Suppliers) ===================== */

type SupplierPayload = {
  denumire: string;
  cui_cif: string;
  nrRegCom?: string | null;
  tip: string;
  tva: boolean;
  tvaData?: string | null; // ISO
  adresa: string;
  oras: string;
  judet: string;
  tara: string;
  contactNume: string;
  email: string;
  telefon: string;
  site?: string | null;
  metodaPlata: string;
  termenPlata: number; // zile
  contBancar: string;
  banca: string;
  status: "activ" | "inactiv";
  notite?: string | null;
};

const toBool = (v: unknown) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes", "da"].includes(v.toLowerCase());
  return Boolean(v);
};
const toInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};
const optDate2 = (v: unknown): Date | null => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** GET /furnizori */
app.get("/furnizori", async (_req, res) => {
  try {
    const list = await prisma.furnizor.findMany({ orderBy: { createdAt: "desc" } });
    res.json(list);
  } catch (error: unknown) {
    console.error("GET /furnizori error:", error);
    res.status(500).json({ error: "Nu am putut încărca furnizorii" });
  }
});

/** POST /furnizori */
app.post("/furnizori", async (req, res) => {
  const p = req.body as SupplierPayload;
  const required: (keyof SupplierPayload)[] = [
    "denumire","cui_cif","tip","adresa","oras","judet","tara",
    "contactNume","email","telefon","metodaPlata","termenPlata",
    "contBancar","banca","status",
  ];
  for (const k of required) {
    if (!p[k as keyof SupplierPayload]) return res.status(400).json({ error: `Câmpul '${k}' este obligatoriu` });
  }

  try {
    const created = await prisma.furnizor.create({
      data: {
        denumire: cleanRequired(p.denumire),
        cui_cif: cleanRequired(p.cui_cif),
        nrRegCom: cleanOptional(p.nrRegCom),
        tip: cleanRequired(p.tip),
        tva: toBool(p.tva),
        tvaData: toBool(p.tva) ? optDate2(p.tvaData) : null,
        adresa: cleanRequired(p.adresa),
        oras: cleanRequired(p.oras),
        judet: cleanRequired(p.judet),
        tara: cleanRequired(p.tara),
        contactNume: cleanRequired(p.contactNume),
        email: cleanRequired(p.email),
        telefon: cleanRequired(p.telefon),
        site: cleanOptional(p.site),
        metodaPlata: cleanRequired(p.metodaPlata),
        termenPlata: toInt(p.termenPlata),
        contBancar: cleanRequired(p.contBancar),
        banca: cleanRequired(p.banca),
        status: cleanRequired(p.status),
        notite: cleanOptional(p.notite),
      },
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") {
      return res.status(409).json({ error: "Denumire sau CUI/CIF deja existent" });
    }
    console.error("POST /furnizori error:", error);
    res.status(500).json({ error: "Nu am putut crea furnizorul" });
  }
});

/** PUT /furnizori/:id */
app.put("/furnizori/:id", async (req, res) => {
  const { id } = req.params;
  const p = req.body as SupplierPayload;

  try {
    const exists = await prisma.furnizor.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Furnizorul nu a fost găsit" });

    const updated = await prisma.furnizor.update({
      where: { id },
      data: {
        denumire: cleanRequired(p.denumire),
        cui_cif: cleanRequired(p.cui_cif),
        nrRegCom: cleanOptional(p.nrRegCom),
        tip: cleanRequired(p.tip),
        tva: toBool(p.tva),
        tvaData: toBool(p.tva) ? optDate2(p.tvaData) : null,
        adresa: cleanRequired(p.adresa),
        oras: cleanRequired(p.oras),
        judet: cleanRequired(p.judet),
        tara: cleanRequired(p.tara),
        contactNume: cleanRequired(p.contactNume),
        email: cleanRequired(p.email),
        telefon: cleanRequired(p.telefon),
        site: cleanOptional(p.site),
        metodaPlata: cleanRequired(p.metodaPlata),
        termenPlata: toInt(p.termenPlata),
        contBancar: cleanRequired(p.contBancar),
        banca: cleanRequired(p.banca),
        status: cleanRequired(p.status),
        notite: cleanOptional(p.notite),
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") {
      return res.status(409).json({ error: "Denumire sau CUI/CIF deja existent" });
    }
    console.error("PUT /furnizori/:id error:", error);
    res.status(500).json({ error: "Nu am putut actualiza furnizorul" });
  }
});

/** DELETE /furnizori/:id */
app.delete("/furnizori/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await prisma.furnizor.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Furnizorul nu a fost găsit" });

    await prisma.furnizor.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error("DELETE /furnizori/:id error:", error);
    res.status(500).json({ error: "Nu am putut șterge furnizorul" });
  }
});

/* ===================== CATEGORII OPERAȚII ===================== */

type OperationCategoryPayload = {
  name: string;
};

// GET /operation-categories
app.get("/operation-categories", async (_req, res) => {
  try {
  const list = await prisma.operationCategory.findMany({ orderBy: { createdAt: "desc" }, include: { operations: true } });
    res.json(list);
  } catch (error: unknown) {
    console.error("GET /operation-categories error:", error);
    res.status(500).json({ error: "Nu am putut încărca categoriile" });
  }
});

// POST /operation-categories
app.post("/operation-categories", async (req, res) => {
  const p = (req.body || {}) as OperationCategoryPayload;
  if (!p.name) return res.status(400).json({ error: "Denumirea este obligatorie" });
  try {
    const created = await prisma.operationCategory.create({
      data: {
        name: cleanRequired(p.name),
      },
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") {
      return res.status(409).json({ error: "Categorie deja existentă" });
    }
    console.error("POST /operation-categories error:", error);
    res.status(500).json({ error: "Nu am putut crea categoria" });
  }
});

// PUT /operation-categories/:id
app.put("/operation-categories/:id", async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as OperationCategoryPayload;
  if (!p.name) return res.status(400).json({ error: "Denumirea este obligatorie" });
  try {
    const exists = await prisma.operationCategory.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Categoria nu a fost găsită" });
    const updated = await prisma.operationCategory.update({
      where: { id },
      data: {
        name: cleanRequired(p.name),
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") {
      return res.status(409).json({ error: "Categorie deja existentă" });
    }
    console.error("PUT /operation-categories/:id error:", error);
    res.status(500).json({ error: "Nu am putut actualiza categoria" });
  }
});

// --- Operations under categories ---
type OperationPayload = {
  name: string;
};

// GET /operation-categories/:id/operations
app.get("/operation-categories/:id/operations", async (req, res) => {
  const { id } = req.params;
  try {
    const ops = await prisma.operation.findMany({ where: { categoryId: id }, orderBy: { createdAt: "desc" } });
    res.json(ops);
  } catch (error: unknown) {
    console.error("GET /operation-categories/:id/operations error:", error);
    res.status(500).json({ error: "Nu am putut încărca operațiile" });
  }
});

// POST /operation-categories/:id/operations
app.post("/operation-categories/:id/operations", async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as OperationPayload;
  if (!p.name) return res.status(400).json({ error: "Denumirea este obligatorie" });
  try {
    const created = await prisma.operation.create({ data: { categoryId: id, name: cleanRequired(p.name) } });
    res.status(201).json(created);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") return res.status(409).json({ error: "Operație duplicată în categorie" });
    console.error("POST /operation-categories/:id/operations error:", error);
    res.status(500).json({ error: "Nu am putut crea operația" });
  }
});

// PUT /operations/:opId
app.put("/operations/:opId", async (req, res) => {
  const { opId } = req.params;
  const p = (req.body || {}) as OperationPayload;
  if (!p.name) return res.status(400).json({ error: "Denumirea este obligatorie" });
  try {
    const updated = await prisma.operation.update({ where: { id: opId }, data: { name: cleanRequired(p.name) } });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") return res.status(409).json({ error: "Operație duplicată în categorie" });
    console.error("PUT /operations/:opId error:", error);
    res.status(500).json({ error: "Nu am putut actualiza operația" });
  }
});

// ===== Third level: Operation Items =====
type OperationItemPayload = { name: string; unit?: string | null };

// GET /operations/:opId/items
app.get("/operations/:opId/items", async (req, res) => {
  const { opId } = req.params;
  try {
  const items = await (prisma as any).operationItem.findMany({ where: { operationId: opId }, orderBy: { createdAt: "desc" } });
    res.json(items);
  } catch (error: unknown) {
    console.error("GET /operations/:opId/items error:", error);
    res.status(500).json({ error: "Nu am putut încărca elementele" });
  }
});

// POST /operations/:opId/items
app.post("/operations/:opId/items", async (req, res) => {
  const { opId } = req.params;
  const p = (req.body || {}) as OperationItemPayload;
  if (!p.name) return res.status(400).json({ error: "Denumirea este obligatorie" });
  try {
  const created = await (prisma as any).operationItem.create({ data: { operationId: opId, name: cleanRequired(p.name), unit: cleanOptional(p.unit) } });
    res.status(201).json(created);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") return res.status(409).json({ error: "Element duplicat în operație" });
    console.error("POST /operations/:opId/items error:", error);
    res.status(500).json({ error: "Nu am putut crea elementul" });
  }
});

// PUT /items/:itemId
app.put("/items/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const p = (req.body || {}) as OperationItemPayload;
  if (!p.name) return res.status(400).json({ error: "Denumirea este obligatorie" });
  try {
  const updated = await (prisma as any).operationItem.update({ where: { id: itemId }, data: { name: cleanRequired(p.name), unit: cleanOptional(p.unit) } });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") return res.status(409).json({ error: "Element duplicat în operație" });
    console.error("PUT /items/:itemId error:", error);
    res.status(500).json({ error: "Nu am putut actualiza elementul" });
  }
});

// DELETE /items/:itemId
app.delete("/items/:itemId", async (req, res) => {
  const { itemId } = req.params;
  try {
    await prisma.operationItem.delete({ where: { id: itemId } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error("DELETE /items/:itemId error:", error);
    res.status(500).json({ error: "Nu am putut șterge elementul" });
  }
});

// DELETE /operations/:opId
app.delete("/operations/:opId", async (req, res) => {
  const { opId } = req.params;
  try {
    await prisma.operation.delete({ where: { id: opId } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error("DELETE /operations/:opId error:", error);
    res.status(500).json({ error: "Nu am putut șterge operația" });
  }
});

// DELETE /operation-categories/:id
app.delete("/operation-categories/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await prisma.operationCategory.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Categoria nu a fost găsită" });
    await prisma.operationCategory.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error("DELETE /operation-categories/:id error:", error);
    res.status(500).json({ error: "Nu am putut șterge categoria" });
  }
});

/* ===================== EQUIPMENT (Scule & Echipamente) ===================== */

type EquipmentPayload = {
  category: string;        // Categorie echipament
  code: string;            // ID / cod intern
  description: string;     // Descriere
  hourlyCost: number;      // Cost orar
};

// GET /equipment
app.get('/equipment', async (_req, res) => {
  try {
    const list = await (prisma as any).equipment.findMany({ orderBy: [{ category: 'asc' }, { code: 'asc' }] });
    res.json(list);
  } catch (error: unknown) {
    console.error('GET /equipment error:', error);
    res.status(500).json({ error: 'Nu am putut încărca echipamentele' });
  }
});

// POST /equipment
app.post('/equipment', async (req, res) => {
  const p = (req.body || {}) as EquipmentPayload;
  if (!p.category || !p.code || !p.description || p.hourlyCost == null) {
    return res.status(400).json({ error: 'Categorie, Cod, Descriere și Cost orar sunt obligatorii' });
  }
  try {
    const created = await (prisma as any).equipment.create({
      data: {
        category: cleanRequired(p.category),
        code: cleanRequired(p.code),
        description: cleanRequired(p.description),
        hourlyCost: Number(p.hourlyCost),
      },
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    if (isPrismaError(error) && (error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Cod echipament deja existent' });
    }
    console.error('POST /equipment error:', error);
    res.status(500).json({ error: 'Nu am putut crea echipamentul' });
  }
});

// PUT /equipment/:id
app.put('/equipment/:id', async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as EquipmentPayload;
  if (!p.category || !p.code || !p.description || p.hourlyCost == null) {
    return res.status(400).json({ error: 'Categorie, Cod, Descriere și Cost orar sunt obligatorii' });
  }
  try {
    const exists = await (prisma as any).equipment.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Echipamentul nu a fost găsit' });
    const updated = await (prisma as any).equipment.update({
      where: { id },
      data: {
        category: cleanRequired(p.category),
        code: cleanRequired(p.code),
        description: cleanRequired(p.description),
        hourlyCost: Number(p.hourlyCost),
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaError(error) && (error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Cod echipament deja existent' });
    }
    console.error('PUT /equipment/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza echipamentul' });
  }
});

// DELETE /equipment/:id
app.delete('/equipment/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await (prisma as any).equipment.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Echipamentul nu a fost găsit' });
    await (prisma as any).equipment.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /equipment/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge echipamentul' });
  }
});

// POST /equipment/rename-category { from, to }
app.post('/equipment/rename-category', async (req, res) => {
  const { from, to } = (req.body || {}) as { from?: string; to?: string };
  const src = cleanRequired(from);
  const dst = cleanRequired(to);
  if (!src || !dst) return res.status(400).json({ error: 'Parametrii from și to sunt obligatorii' });
  try {
    const result = await (prisma as any).equipment.updateMany({ where: { category: src }, data: { category: dst } });
    res.json({ updated: result.count ?? 0 });
  } catch (error: unknown) {
    console.error('POST /equipment/rename-category error:', error);
    res.status(500).json({ error: 'Nu am putut redenumi categoria' });
  }
});



/* ===================== BOOT ===================== */

const PORT = Number(process.env.PORT || 4000);

(async () => {
  try {
    await prisma.$connect();
  console.log('Prisma connected to DB');
    console.log('DB URL:', process.env.DATABASE_URL);
    app.listen(PORT, () =>
      console.log(`API running on http://localhost:${PORT}`)
    );
  } catch (error: unknown) {
  console.error('Prisma failed to connect:', error);
    process.exit(1);
  }
})();


