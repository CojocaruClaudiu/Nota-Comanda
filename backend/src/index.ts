// src/index.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from "./auth/authRoutes";

const prisma = new PrismaClient({ log: ['warn', 'error'] });
const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

/** Helpers */
const cleanRequired = (v: unknown): string => String(v ?? '').trim();
const cleanOptional = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : null; // empty -> null so UNIQUE allows multiples
};
const toDate = (v: unknown): Date => new Date(String(v));
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
  } catch (e: any) {
    console.error('GET /clients error:', e);
    res.status(500).json({ error: e?.message || 'Failed to fetch clients' });
  }
});

/** Create client (registrulComertului & cif OPTIONAL) */
app.post('/clients', async (req, res) => {
  try {
    const { name, location, contact, registrulComertului, cif } = req.body || {};

    if (!name || !location || !contact) {
      return res
        .status(400)
        .json({ error: 'Nume, Locație și Contact sunt obligatorii' });
    }

    const client = await prisma.client.create({
      data: {
        name: cleanRequired(name),
        location: cleanRequired(location),
        contact: cleanRequired(contact),
        registrulComertului: cleanOptional(registrulComertului),
        cif: cleanOptional(cif),
      },
    });
    res.status(201).json(client);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'CIF sau Registrul Comerțului este deja folosit.' });
    }
    console.error('POST /clients error:', e);
    res.status(500).json({ error: e?.message || 'Failed to create client' });
  }
});

/** Update client (registrulComertului & cif OPTIONAL) */
app.put('/clients/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, contact, registrulComertului, cif } = req.body || {};

  if (!name || !location || !contact) {
    return res
      .status(400)
      .json({ error: 'Nume, Locație și Contact sunt obligatorii' });
  }

  try {
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Clientul nu a fost găsit' });

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: cleanRequired(name),
        location: cleanRequired(location),
        contact: cleanRequired(contact),
        registrulComertului: cleanOptional(registrulComertului),
        cif: cleanOptional(cif),
      },
    });
    res.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'CIF sau Registrul Comerțului este deja folosit.' });
    }
    console.error('PUT /clients/:id error:', e);
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
  } catch (e: any) {
    console.error('DELETE /clients/:id error:', e);
    res.status(500).json({ error: e?.message || 'Nu am putut șterge clientul' });
  }
});

/* ===================== ECHIPA (Employees & Leave) ===================== */

type EmployeePayload = {
  name: string;
  qualifications?: string[];
  hiredAt: string;            // ISO date
  birthDate?: string | null;  // 👈 NEW (ISO, optional)
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
      const age = ageFrom(e.birthDate, now); // 👈 NEW
      return { ...e, entitledDays: ent, takenDays: taken, remainingDays: remaining, age };
    });

    res.json(result);
  } catch (e: any) {
    console.error('GET /employees error:', e);
    res.status(500).json({ error: e?.message || 'Nu am putut încărca echipa' });
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
        birthDate: req.body?.birthDate ? toDate(req.body.birthDate) : null, // 👈 NEW
      },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('POST /employees error:', e);
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
        birthDate: req.body?.birthDate ? toDate(req.body.birthDate) : null, // 👈 NEW
      },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('PUT /employees/:id error:', e);
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
  } catch (e: any) {
    console.error('DELETE /employees/:id error:', e);
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
  } catch (e: any) {
    console.error('POST /employees/:id/leaves error:', e);
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
  } catch (e: any) {
    console.error('GET /employees/:id/leaves error:', e);
    res.status(500).json({ error: 'Nu am putut încărca istoricul concediilor' });
  }
});

/** DELETE /leaves/:leaveId */
app.delete('/leaves/:leaveId', async (req, res) => {
  const { leaveId } = req.params;
  try {
    await prisma.leave.delete({ where: { id: leaveId } });
    res.status(204).send();
  } catch (e: any) {
    console.error('DELETE /leaves/:leaveId error:', e);
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
  } catch (e: any) {
    console.error('GET /cars error:', e);
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
  } catch (e: any) {
    if (e?.code === 'P2002') {
      // unique vin or placute
      return res.status(409).json({ error: 'VIN sau plăcuțele sunt deja folosite' });
    }
    console.error('POST /cars error:', e);
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
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'VIN sau plăcuțele sunt deja folosite' });
    }
    console.error('PUT /cars/:id error:', e);
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
  } catch (e: any) {
    console.error('DELETE /cars/:id error:', e);
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
  } catch (e) {
    console.error("GET /furnizori error:", e);
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
    if (!(p as any)[k]) return res.status(400).json({ error: `Câmpul '${k}' este obligatoriu` });
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
  } catch (e: any) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "Denumire sau CUI/CIF deja existent" });
    }
    console.error("POST /furnizori error:", e);
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
  } catch (e: any) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "Denumire sau CUI/CIF deja existent" });
    }
    console.error("PUT /furnizori/:id error:", e);
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
  } catch (e) {
    console.error("DELETE /furnizori/:id error:", e);
    res.status(500).json({ error: "Nu am putut șterge furnizorul" });
  }
});



/* ===================== BOOT ===================== */

const PORT = Number(process.env.PORT || 4000);

(async () => {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to DB');
    console.log('DB URL:', process.env.DATABASE_URL);
    app.listen(PORT, () =>
      console.log(`API running on http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error('❌ Prisma failed to connect:', e);
    process.exit(1);
  }
})();


