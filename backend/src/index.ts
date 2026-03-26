// src/index.ts
// <reference types="@prisma/client" />
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client'; // ensure `npx prisma generate` run after adding Producator model
import multer from 'multer';
import authRoutes from "./auth/authRoutes";
import projectRoutes from "./routes/projects";
import clientLocationRoutes from "./routes/clientLocations";
import cashRoutes from "./routes/cash/cashRoutes";
import materialsRoutes from "./routes/materials";
import operationSheetsRoutes from "./routes/operationSheets";
import exchangeRateRoutes from "./routes/exchangeRates";
import receptionsRoutes from "./routes/receptions";
import offersRoutes from "./routes/offers";
import equipmentRoutes from "./routes/equipment";
import jwt from 'jsonwebtoken';
import { calculateLeaveBalance } from './services/leaveCalculations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({ log: ['warn', 'error'] });
const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Simple auth decode middleware (non-strict for now)
app.use((req, _res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try { (req as any).user = jwt.verify(token, process.env.JWT_SECRET || 'change_me_now'); } catch { /* ignore */ }
  }
  next();
});
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/client-locations", clientLocationRoutes);
app.use("/api", cashRoutes);
app.use("/materials", materialsRoutes);
app.use("/operation-sheets", operationSheetsRoutes);
app.use("/exchange-rates", exchangeRateRoutes);
app.use("/receptions", receptionsRoutes);
app.use("/offers", offersRoutes);
app.use("/equipment", equipmentRoutes);

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

type AssistantDocIntent = {
  key: 'expItp' | 'expRca' | 'expRovi' | 'expCasco';
  code: 'ITP' | 'RCA' | 'ROVINIETA' | 'CASCO';
};

type AssistantContextPayload = {
  intent?: AssistantDocIntent['key'] | null;
  matchedPlate?: string | null;
};

const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const getPlateTokens = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const ASSISTANT_INTENTS: AssistantDocIntent[] = [
  { key: 'expItp', code: 'ITP' },
  { key: 'expRca', code: 'RCA' },
  { key: 'expRovi', code: 'ROVINIETA' },
  { key: 'expCasco', code: 'CASCO' },
];

const ASSISTANT_INTENT_BY_KEY = ASSISTANT_INTENTS.reduce<Record<string, AssistantDocIntent>>((acc, intent) => {
  acc[intent.key] = intent;
  return acc;
}, {});

const detectAssistantDocIntent = (question: string): AssistantDocIntent | null => {
  const q = question.toLowerCase();
  if (/\bitp\b/.test(q)) return ASSISTANT_INTENT_BY_KEY.expItp;
  if (/\brca\b/.test(q)) return ASSISTANT_INTENT_BY_KEY.expRca;
  if (/casco/.test(q)) return ASSISTANT_INTENT_BY_KEY.expCasco;
  if (/rovi|roviniet|vignet|viniet/.test(q)) return ASSISTANT_INTENT_BY_KEY.expRovi;
  return null;
};

const normalizeAssistantText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const hasExpiryVerb = (question: string) => /expir|exprima/.test(question);

const isFleetEarliestExpiryQuestion = (question: string) =>
  hasExpiryVerb(question) &&
  /(prima|primul|cel mai repede|mai repede|prima data)/.test(question) &&
  /(masina|masini|vehicul|flota|care)/.test(question);

const isFleetUpcomingExpiryQuestion = (question: string) =>
  hasExpiryVerb(question) &&
  /(urmatoar|perioad|in curand|urmeaza|care sunt|ce masini|lista)/.test(question);

const startOfDay = (value: Date) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (value: Date, days: number) => {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
};

const toValidDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
};

const extractPlateFromQuestion = (question: string): string | null => {
  const forMatch = question.match(/pentru\s+([A-Za-z0-9\-\s]+)/i);
  const rawCandidate = forMatch
    ? forMatch[1].replace(/[?.!,;:]+$/g, '').trim()
    : (question.match(/\b[A-Za-z]{1,3}[\s-]?\d{1,3}[\s-]?[A-Za-z]{1,3}\b/i)?.[0] || '').trim();

  if (!rawCandidate) return null;
  return normalizePlate(rawCandidate).length > 0 ? rawCandidate : null;
};

const derivePlateCandidateFromContext = (candidate: string, contextPlate: string | null): string | null => {
  if (!contextPlate) return null;

  const candidateTokens = getPlateTokens(candidate);
  const contextTokens = getPlateTokens(contextPlate);
  if (candidateTokens.length === 0 || contextTokens.length < 3) return null;

  const contextCounty = contextTokens[0];
  const contextSuffix = contextTokens[contextTokens.length - 1];

  if (candidateTokens.length === 1) {
    const only = candidateTokens[0];
    if (/^\d{1,3}$/.test(only)) {
      return `${contextCounty} ${only} ${contextSuffix}`;
    }
    return null;
  }

  if (candidateTokens.length === 2) {
    const [first, second] = candidateTokens;
    if (/^\d{1,3}$/.test(first) && /^[A-Z]{1,3}$/.test(second)) {
      return `${contextCounty} ${first} ${second}`;
    }
    if (/^[A-Z]{1,3}$/.test(first) && /^\d{1,3}$/.test(second)) {
      return `${first} ${second} ${contextSuffix}`;
    }
  }

  return null;
};

const findCarsByLoosePlateCandidate = (cars: Array<any>, candidate: string) => {
  const candidateNormalized = normalizePlate(candidate);
  const candidateTokens = getPlateTokens(candidate);
  const digitsOnly = /^\d+$/.test(candidateNormalized);

  if (!candidateNormalized) return [];

  return cars.filter((entry) => {
    const rawPlate = String(entry.placute || '');
    const normalizedPlate = normalizePlate(rawPlate);
    if (!normalizedPlate) return false;

    if (normalizedPlate === candidateNormalized) return true;
    if (normalizedPlate.includes(candidateNormalized)) return true;

    const plateTokens = getPlateTokens(rawPlate);
    if (candidateTokens.length > 0) {
      const allCandidateTokensMatch = candidateTokens.every((token) =>
        plateTokens.some((plateToken) => plateToken === token || plateToken.includes(token)),
      );
      if (allCandidateTokensMatch) return true;
    }

    if (digitsOnly && plateTokens.some((token) => /^\d+$/.test(token) && token === candidateNormalized)) {
      return true;
    }

    return false;
  });
};

const formatRoDate = (date: Date) =>
  new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

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

/** Ensure DB enum OrderStatus contains all extended values used by the app. */
async function ensureOrderStatusEnum() {
  const values = [
    'SUPPLIER_OUT_OF_STOCK',
    'UNPAID_ORDER',
    'PAID_FULL_ORDER',
    'PAID_PARTIAL_ORDER',
    'IN_DELIVERY',
    'RETURNED_REFUSED',
  ];
  for (const v of values) {
    try {
      const rows: Array<{ exists: boolean }> = await prisma.$queryRawUnsafe(
        `SELECT EXISTS(
           SELECT 1 FROM pg_type t
           JOIN pg_enum e ON t.oid = e.enumtypid
           WHERE t.typname = 'OrderStatus' AND e.enumlabel = '${v}'
         ) AS exists`
      );
      const exists = Boolean(Array.isArray(rows) && rows[0] && (rows[0] as any).exists);
      if (!exists) {
        await prisma.$executeRawUnsafe(`ALTER TYPE "OrderStatus" ADD VALUE '${v}'`);
      }
    } catch (e) {
      console.warn(`ensureOrderStatusEnum: failed to add ${v} (continuing):`, e);
    }
  }
}

// Debug endpoint to verify enum values present in DB
app.get('/debug/order-status', async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT e.enumlabel as label
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'OrderStatus'
       ORDER BY e.enumsortorder`
    );
    res.json({ values: rows.map(r => r.label) });
  } catch (e) {
    res.status(500).json({ error: 'failed to read enum', detail: String(e) });
  }
});

/** Ping */
app.get('/ping', (_req, res) => res.json({ pong: true }));

/** Public assistant endpoint used from login page */
app.post('/assistant/public-ask', async (req, res) => {
  try {
    const rawQuestion = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!rawQuestion) {
      return res.status(400).json({ error: 'Întrebarea este obligatorie.' });
    }

    const rawContext = (req.body?.context || {}) as AssistantContextPayload;
    const contextIntent =
      typeof rawContext.intent === 'string'
        ? ASSISTANT_INTENT_BY_KEY[rawContext.intent] || null
        : null;
    const contextPlate = typeof rawContext.matchedPlate === 'string' ? rawContext.matchedPlate.trim() : '';

    const normalizedQuestion = normalizeAssistantText(rawQuestion);
    const explicitIntent = detectAssistantDocIntent(rawQuestion);
    const intent = explicitIntent || contextIntent;
    const asksFleetEarliest = isFleetEarliestExpiryQuestion(normalizedQuestion);
    const asksFleetUpcoming = isFleetUpcomingExpiryQuestion(normalizedQuestion);
    const isFleetExpiryQuery = asksFleetEarliest || asksFleetUpcoming;

    if (!intent && !isFleetExpiryQuery) {
      return res.json({
        intent: null,
        matchedPlate: null,
        answer:
          'Momentan pot răspunde la întrebări despre expirarea ITP, RCA, CASCO sau rovinietă. Exemplu: "Când expiră ITP-ul pentru PH-16-TOP?"',
      });
    }

    const plateInQuestion = extractPlateFromQuestion(rawQuestion);
    if (!isFleetExpiryQuery && !plateInQuestion && !contextPlate) {
      return res.json({
        intent: intent?.key ?? null,
        matchedPlate: null,
        answer: `Scrie întrebarea în formatul: "Când expiră ${intent?.code || 'ITP'}-ul pentru PH-16-TOP?"`,
      });
    }

    const cars = await (prisma as any).car.findMany({
      select: {
        placute: true,
        status: true,
        expItp: true,
        expRca: true,
        expRovi: true,
        expCasco: true,
      },
    });

    const activeCars = cars.filter((entry: any) => !['RETRAS', 'VANDUT'].includes(String(entry.status || '')));
    const today = startOfDay(new Date());

    if (isFleetExpiryQuery) {
      type FleetEntry = { placute: string; expiresAt: Date; intent: AssistantDocIntent };

      const intentsForFleet = explicitIntent ? [explicitIntent] : ASSISTANT_INTENTS;
      const fleetEntries: FleetEntry[] = activeCars.flatMap((entry: any) =>
        intentsForFleet
          .map((item) => {
            const expiresAt = toValidDate((entry as any)[item.key]);
            if (!expiresAt) return null;
            return { placute: String(entry.placute), expiresAt, intent: item } as FleetEntry;
          })
          .filter((item): item is FleetEntry => Boolean(item)),
      );

      if (!fleetEntries.length) {
        const docsLabel = explicitIntent ? explicitIntent.code : 'documente';
        return res.json({
          intent: explicitIntent?.key ?? null,
          matchedPlate: null,
          expiresAt: null,
          answer: `Nu există date de expirare ${docsLabel} înregistrate pentru mașinile active.`,
        });
      }

      const sortedEntries = [...fleetEntries].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
      const futureEntries = sortedEntries.filter((entry) => entry.expiresAt.getTime() >= today.getTime());

      if (asksFleetEarliest) {
        const firstFuture = futureEntries[0] || null;
        if (firstFuture) {
          const answer = explicitIntent
            ? `${explicitIntent.code}-ul care expiră primul este pentru ${firstFuture.placute}, la ${formatRoDate(firstFuture.expiresAt)}.`
            : `Primul document care expiră este ${firstFuture.intent.code} pentru ${firstFuture.placute}, la ${formatRoDate(firstFuture.expiresAt)}.`;

          return res.json({
            intent: explicitIntent?.key ?? null,
            matchedPlate: firstFuture.placute,
            expiresAt: firstFuture.expiresAt,
            answer,
          });
        }

        const latestExpired = sortedEntries[sortedEntries.length - 1];
        const answer = explicitIntent
          ? `Toate ${explicitIntent.code}-urile din flotă sunt deja expirate. Cel mai recent a expirat pentru ${latestExpired.placute}, la ${formatRoDate(latestExpired.expiresAt)}.`
          : `Toate documentele urmărite sunt deja expirate. Cel mai recent a expirat ${latestExpired.intent.code} pentru ${latestExpired.placute}, la ${formatRoDate(latestExpired.expiresAt)}.`;

        return res.json({
          intent: explicitIntent?.key ?? null,
          matchedPlate: latestExpired.placute,
          expiresAt: latestExpired.expiresAt,
          answer,
        });
      }

      const horizon = addDays(today, 90);
      let periodEntries = futureEntries.filter((entry) => entry.expiresAt.getTime() <= horizon.getTime());
      if (!periodEntries.length) {
        periodEntries = futureEntries.slice(0, 5);
      }
      const topEntries = periodEntries.slice(0, 5);

      if (!topEntries.length) {
        const docsLabel = explicitIntent ? explicitIntent.code : 'documentele';
        return res.json({
          intent: explicitIntent?.key ?? null,
          matchedPlate: null,
          expiresAt: null,
          answer: `Nu există ${docsLabel} care să mai expire în viitor pentru mașinile active.`,
        });
      }

      const intro = periodEntries.length
        ? 'În următoarea perioadă expiră:'
        : 'Următoarele expirări din flotă sunt:';
      const lines = topEntries.map((entry, idx) =>
        `${idx + 1}. ${entry.placute} — ${entry.intent.code}: ${formatRoDate(entry.expiresAt)}`,
      );

      return res.json({
        intent: explicitIntent?.key ?? null,
        matchedPlate: null,
        expiresAt: topEntries[0].expiresAt,
        answer: `${intro}\n${lines.join('\n')}`,
      });
    }

    if (!intent) {
      return res.json({
        intent: null,
        matchedPlate: null,
        answer:
          'Momentan pot răspunde la întrebări despre expirarea ITP, RCA, CASCO sau rovinietă. Exemplu: "Când expiră ITP-ul pentru PH-16-TOP?"',
      });
    }

    const resolvedIntent = intent;

    let resolvedCandidate = plateInQuestion || contextPlate || '';
    let car: any | undefined;

    if (plateInQuestion) {
      const normalizedAskedPlate = normalizePlate(plateInQuestion);
      car = cars.find((entry: any) => normalizePlate(String(entry.placute || '')) === normalizedAskedPlate);

      if (!car) {
        const derivedCandidate = derivePlateCandidateFromContext(plateInQuestion, contextPlate || null);
        if (derivedCandidate) {
          resolvedCandidate = derivedCandidate;
          const normalizedDerivedCandidate = normalizePlate(derivedCandidate);
          car = cars.find((entry: any) => normalizePlate(String(entry.placute || '')) === normalizedDerivedCandidate);
        }
      }

      if (!car) {
        const fuzzyMatches = findCarsByLoosePlateCandidate(cars, plateInQuestion);
        if (fuzzyMatches.length === 1) {
          car = fuzzyMatches[0];
        } else if (fuzzyMatches.length > 1) {
          const samplePlates = fuzzyMatches.slice(0, 4).map((entry: any) => String(entry.placute)).join(', ');
          return res.json({
            intent: resolvedIntent.key,
            matchedPlate: plateInQuestion.toUpperCase(),
            answer: `Am găsit mai multe mașini pentru "${plateInQuestion.toUpperCase()}": ${samplePlates}. Te rog specifică numărul complet (ex: PH-16-TOP).`,
          });
        }
      }
    } else if (contextPlate) {
      const normalizedContextPlate = normalizePlate(contextPlate);
      car = cars.find((entry: any) => normalizePlate(String(entry.placute || '')) === normalizedContextPlate);
    }

    const prettyAskedPlate = resolvedCandidate.toUpperCase();

    if (!car) {
      return res.json({
        intent: resolvedIntent.key,
        matchedPlate: prettyAskedPlate || null,
        answer: prettyAskedPlate
          ? `Nu am găsit mașina ${prettyAskedPlate}. Verifică numărul de înmatriculare.`
          : 'Nu am putut identifica mașina. Te rog specifică numărul complet (ex: PH-16-TOP).',
      });
    }

    const expiresAt = (car as any)[resolvedIntent.key] as Date | null;
    if (!expiresAt) {
      return res.json({
        intent: resolvedIntent.key,
        matchedPlate: car.placute,
        expiresAt: null,
        answer: `Nu există data de expirare ${resolvedIntent.code} setată pentru ${car.placute}.`,
      });
    }

    const expiry = startOfDay(new Date(expiresAt));
    const isExpired = expiry.getTime() < today.getTime();

    const answer = isExpired
      ? `${resolvedIntent.code}-ul pentru ${car.placute} a expirat la ${formatRoDate(expiresAt)}.`
      : `${resolvedIntent.code}-ul pentru ${car.placute} expiră la ${formatRoDate(expiresAt)}.`;

    return res.json({
      intent: resolvedIntent.key,
      matchedPlate: car.placute,
      expiresAt,
      answer,
    });
  } catch (error: unknown) {
    console.error('POST /assistant/public-ask error:', error);
    return res.status(500).json({ error: 'Nu am putut procesa întrebarea.' });
  }
});

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

/* ===================== PRODUCATORI (Manufacturers) ===================== */

type ProducatorPayload = {
  name: string;
  status?: string; // activ / inactiv
  adresa?: string | null;
  contBancar?: string | null;
  banca?: string | null;
  email?: string | null;
  telefon?: string | null;
  site?: string | null;
  observatii?: string | null;
};

// GET /producatori
app.get('/producatori', async (_req, res) => {
  try {
    const list = await prisma.producator.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (error) {
    console.error('GET /producatori error:', error);
    res.status(500).json({ error: 'Nu am putut încărca producătorii' });
  }
});

// POST /producatori
app.post('/producatori', async (req, res) => {
  try {
  const { name, status = 'activ', adresa, contBancar, banca, email, telefon, site, observatii } = (req.body || {}) as ProducatorPayload;
    if (!name?.trim()) return res.status(400).json({ error: 'Numele este obligatoriu' });
    const created = await prisma.producator.create({
      data: {
        name: cleanRequired(name),
        status: cleanRequired(status),
        adresa: cleanOptional(adresa),
        contBancar: cleanOptional(contBancar),
        banca: cleanOptional(banca),
        email: cleanOptional(email),
        telefon: cleanOptional(telefon),
  site: cleanOptional(site),
  observatii: cleanOptional(observatii),
      },
    });
    res.status(201).json(created);
  } catch (error) {
    if (isPrismaError(error) && (error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Numele producătorului este deja folosit.' });
    }
    console.error('POST /producatori error:', error);
    res.status(500).json({ error: 'Nu am putut crea producătorul' });
  }
});

// PUT /producatori/:id
app.put('/producatori/:id', async (req, res) => {
  const { id } = req.params;
  const { name, status = 'activ', adresa, contBancar, banca, email, telefon, site, observatii } = (req.body || {}) as ProducatorPayload;
  if (!name?.trim()) return res.status(400).json({ error: 'Numele este obligatoriu' });
  try {
    const exists = await prisma.producator.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Producătorul nu a fost găsit' });
    const updated = await prisma.producator.update({
      where: { id },
      data: {
        name: cleanRequired(name),
        status: cleanRequired(status),
        adresa: cleanOptional(adresa),
        contBancar: cleanOptional(contBancar),
        banca: cleanOptional(banca),
        email: cleanOptional(email),
        telefon: cleanOptional(telefon),
  site: cleanOptional(site),
  observatii: cleanOptional(observatii),
      },
    });
    res.json(updated);
  } catch (error) {
    if (isPrismaError(error) && (error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Numele producătorului este deja folosit.' });
    }
    console.error('PUT /producatori/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza producătorul' });
  }
});

// DELETE /producatori/:id
app.delete('/producatori/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await prisma.producator.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Producătorul nu a fost găsit' });
    await prisma.producator.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /producatori/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge producătorul' });
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
  cnp?: string | null;
  phone?: string | null;
  idSeries?: string | null;
  idNumber?: string | null;
  idIssuer?: string | null;
  idIssueDateISO?: string | null;
  county?: string | null;
  locality?: string | null;
  address?: string | null;
  isActive?: boolean;
  deactivatedAt?: string | null; // Date when employee left (freezes leave calculations)
};
type LeavePayload = {
  startDate: string; // ISO date for start
  days: number;      // positive integer
  note?: string;
};

/** GET /employees  -> list with computed {entitledDays, takenDays, remainingDays} for current year */
app.get('/employees', async (_req, res) => {
  try {
    const employees = await (prisma as any).employee.findMany({
      orderBy: { name: 'asc' },
      include: { qualifications: { select: { name: true } } },
    });

    // Calculate leave balance for each employee using new service
    const result = await Promise.all(
      (employees as any[]).map(async (e: any) => {
        const age = ageFrom(e.birthDate, new Date());
        const qNames = Array.isArray((e as any).qualifications)
          ? (e as any).qualifications.map((q: { name: string }) => q.name)
          : [];
        
        // Use new leave calculation service
        let leaveBalance;
        try {
          const manualCarryOverDays = (e as any).manualCarryOverDays;
          const manualOverride = typeof manualCarryOverDays === 'number' && manualCarryOverDays > 0
            ? manualCarryOverDays
            : undefined;
          // For inactive employees, freeze calculations at deactivation date
          const calcDate = e.isActive === false && e.deactivatedAt
            ? new Date(e.deactivatedAt)
            : new Date();
          leaveBalance = await calculateLeaveBalance(e.id, e.hiredAt, manualOverride, calcDate);
        } catch (error) {
          // Fallback to old calculation if service fails
          console.warn(`Failed to calculate leave for ${e.name}, using fallback:`, error);
          const ent = entitledDays(e.hiredAt, new Date());
          const yearStart = new Date(new Date().getFullYear(), 0, 1);
          const yearEnd = new Date(new Date().getFullYear() + 1, 0, 1);
          const taken = await prisma.leave.aggregate({
            where: { employeeId: e.id, startDate: { gte: yearStart, lt: yearEnd } },
            _sum: { days: true },
          });
          leaveBalance = {
            annualEntitlement: ent,
            accrued: ent,
            taken: taken._sum.days ?? 0,
            available: Math.max(0, ent - (taken._sum.days ?? 0)),
          };
        }
        
        const { qualifications, ...rest } = e as any;
        return {
          ...rest,
          qualifications: qNames,
          entitledDays: leaveBalance.annualEntitlement,
          takenDays: leaveBalance.taken,
          remainingDays: leaveBalance.available,
          age,
          // Extended leave info for new UI
          leaveBalance: {
            accrued: leaveBalance.accrued,
            carriedOver: leaveBalance.carriedOver,
            companyShutdownDays: leaveBalance.companyShutdownDays,
            voluntaryDays: leaveBalance.voluntaryDays,
            pendingDays: leaveBalance.pendingDays,
          },
        };
      })
    );

    res.json(result);
  } catch (error: unknown) {
    console.error('GET /employees error:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Nu am putut încărca echipa' });
  }
});

/** POST /employees */
app.post('/employees', async (req, res) => {
  try {
    const { name, qualifications = [], hiredAt, isActive } = (req.body || {}) as EmployeePayload;
    if (!name || !hiredAt) {
      return res.status(400).json({ error: 'Nume și Data angajării sunt obligatorii' });
    }
    const qualNames = Array.isArray(qualifications)
      ? Array.from(new Set(qualifications.map(q => String(q).trim()).filter(Boolean)))
      : [];
  const created = await (prisma as any).employee.create({
      data: {
        name: cleanRequired(name),
        hiredAt: toDate(hiredAt),
        isActive: typeof isActive === 'boolean' ? isActive : true,
        birthDate: req.body?.birthDate ? toDate(req.body.birthDate) : null,
        cnp: cleanOptional(req.body?.cnp),
        phone: cleanOptional(req.body?.phone),
        idSeries: cleanOptional(req.body?.idSeries),
        idNumber: cleanOptional(req.body?.idNumber),
        idIssuer: cleanOptional(req.body?.idIssuer),
        idIssueDateISO: req.body?.idIssueDateISO ? toDate(req.body.idIssueDateISO) : null,
        county: cleanOptional(req.body?.county),
        locality: cleanOptional(req.body?.locality),
        address: cleanOptional(req.body?.address),
        manualCarryOverDays: req.body?.manualCarryOverDays !== undefined ? Number(req.body.manualCarryOverDays) : 0,
        qualifications: {
          connectOrCreate: qualNames.map((n) => ({
            where: { name: n },
            create: { name: n },
          })),
        },
      },
      include: { qualifications: { select: { name: true } } },
    });
    const { qualifications: q, ...rest } = created as any;
    res.status(201).json({ ...rest, qualifications: (q || []).map((x: any) => x.name) });
  } catch (error: unknown) {
    console.error('POST /employees error:', error);
    res.status(500).json({ error: 'Nu am putut crea angajatul' });
  }
});

/** PUT /employees/:id */
app.put('/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { name, qualifications = [], hiredAt, isActive, deactivatedAt } = (req.body || {}) as EmployeePayload;
    if (!name || !hiredAt) {
      return res.status(400).json({ error: 'Nume și Data angajării sunt obligatorii' });
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Angajatul nu a fost găsit' });

    const qualNames = Array.isArray(qualifications)
      ? Array.from(new Set(qualifications.map(q => String(q).trim()).filter(Boolean)))
      : [];

    // Handle deactivatedAt: can be set (string), cleared (null), or unchanged (undefined)
    let deactivatedAtValue: Date | null | undefined = undefined;
    let finalLeaveBalanceValue: number | null | undefined = undefined;
    
    if (deactivatedAt === null) {
      deactivatedAtValue = null; // Clear the date (reactivating)
      finalLeaveBalanceValue = null; // Clear the final balance (reactivating)
    } else if (typeof deactivatedAt === 'string') {
      deactivatedAtValue = toDate(deactivatedAt); // Set the date (deactivating)
      
      // Calculate final leave balance at deactivation for payout tracking
      try {
        const manualCarryOverDays = existing.manualCarryOverDays;
        const manualOverride = typeof manualCarryOverDays === 'number' && manualCarryOverDays > 0
          ? manualCarryOverDays
          : undefined;
        const leaveBalance = await calculateLeaveBalance(id, existing.hiredAt, manualOverride, deactivatedAtValue);
        finalLeaveBalanceValue = leaveBalance.available;
      } catch (error) {
        console.warn(`Failed to calculate final leave balance for employee ${id}:`, error);
        // Don't fail the update, just don't set the balance
      }
    }

    const updated = await (prisma as any).employee.update({
      where: { id },
      data: {
        name: cleanRequired(name),
        hiredAt: toDate(hiredAt),
        isActive: typeof isActive === 'boolean' ? isActive : existing.isActive,
        ...(deactivatedAtValue !== undefined && { deactivatedAt: deactivatedAtValue }),
        ...(finalLeaveBalanceValue !== undefined && { finalLeaveBalance: finalLeaveBalanceValue }),
        birthDate: req.body?.birthDate ? toDate(req.body.birthDate) : null,
        cnp: cleanOptional(req.body?.cnp),
        phone: cleanOptional(req.body?.phone),
        idSeries: cleanOptional(req.body?.idSeries),
        idNumber: cleanOptional(req.body?.idNumber),
        idIssuer: cleanOptional(req.body?.idIssuer),
        idIssueDateISO: req.body?.idIssueDateISO ? toDate(req.body.idIssueDateISO) : null,
        county: cleanOptional(req.body?.county),
        locality: cleanOptional(req.body?.locality),
        address: cleanOptional(req.body?.address),
        manualCarryOverDays: req.body?.manualCarryOverDays !== undefined ? Number(req.body.manualCarryOverDays) : undefined,
        qualifications: {
          set: [],
          connectOrCreate: qualNames.map((n) => ({ where: { name: n }, create: { name: n } })),
        },
      },
      include: { qualifications: { select: { name: true } } },
    });
    const { qualifications: q, ...rest } = updated as any;
    res.json({ ...rest, qualifications: (q || []).map((x: any) => x.name) });
  } catch (error: unknown) {
    console.error('PUT /employees/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza angajatul' });
  }
});

/* ===================== QUALIFICATIONS ===================== */

type QualificationPayload = { name: string };

// GET /qualifications
app.get('/qualifications', async (_req, res) => {
  try {
    const list = await (prisma as any).qualification.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (error: unknown) {
    console.error('GET /qualifications error:', error);
    res.status(500).json({ error: 'Nu am putut încărca calificările' });
  }
});

// POST /qualifications
app.post('/qualifications', async (req, res) => {
  const p = (req.body || {}) as QualificationPayload;
  if (!p.name) return res.status(400).json({ error: 'Denumirea este obligatorie' });
  try {
    const created = await (prisma as any).qualification.create({ data: { name: cleanRequired(p.name) } });
    res.status(201).json(created);
  } catch (error: any) {
    if (isPrismaError(error) && error.code === 'P2002') {
      return res.status(409).json({ error: 'Calificare deja existentă' });
    }
    console.error('POST /qualifications error:', error);
    res.status(500).json({ error: 'Nu am putut crea calificarea' });
  }
});

// PUT /qualifications/:id
app.put('/qualifications/:id', async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as QualificationPayload;
  if (!p.name) return res.status(400).json({ error: 'Denumirea este obligatorie' });
  try {
    const exists = await (prisma as any).qualification.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Calificarea nu a fost găsită' });
    const updated = await (prisma as any).qualification.update({ where: { id }, data: { name: cleanRequired(p.name) } });
    res.json(updated);
  } catch (error: any) {
    if (isPrismaError(error) && error.code === 'P2002') {
      return res.status(409).json({ error: 'Calificare deja existentă' });
    }
    console.error('PUT /qualifications/:id error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza calificarea' });
  }
});

// DELETE /qualifications/:id
app.delete('/qualifications/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await (prisma as any).qualification.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    if ((error as any)?.code === 'P2003') {
      // FK constraint failed (has labor lines)
      return res.status(409).json({ error: 'Nu se poate șterge: există linii de manoperă asociate' });
    }
    console.error('DELETE /qualifications/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge calificarea' });
  }
});

// Grouped fetch: qualifications with labor lines
app.get('/qualifications-with-lines', async (_req, res) => {
  try {
    const list = await (prisma as any).qualification.findMany({
      orderBy: { name: 'asc' },
      include: { laborLines: { orderBy: [{ name: 'asc' }] } },
    });
    res.json(list);
  } catch (error: unknown) {
    console.error('GET /qualifications-with-lines error:', error);
    res.status(500).json({ error: 'Nu am putut încărca datele' });
  }
});

/* ===================== LABOR LINES (Linii Manoperă) ===================== */

type LaborLinePayload = {
  name: string;
  unit?: string | null;           // default "ora"
  hourlyRate: number;             // cost unitar / ora
  currency?: import('@prisma/client').Currency | null; // default RON
  active?: boolean | null;
  notes?: string | null;
};

// GET /qualifications/:id/labor-lines
app.get('/qualifications/:id/labor-lines', async (req, res) => {
  const { id } = req.params;
  try {
    const lines = await (prisma as any).laborLine.findMany({ where: { qualificationId: id }, orderBy: [{ name: 'asc' }] });
    res.json(lines);
  } catch (error: unknown) {
    console.error('GET /qualifications/:id/labor-lines error:', error);
    res.status(500).json({ error: 'Nu am putut încărca liniile de manoperă' });
  }
});

// POST /qualifications/:id/labor-lines
app.post('/qualifications/:id/labor-lines', async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as LaborLinePayload;
  if (!p.name || p.hourlyRate == null) return res.status(400).json({ error: 'Denumire și tarif orar sunt obligatorii' });
  try {
    const created = await (prisma as any).laborLine.create({
      data: {
        qualificationId: id,
        name: cleanRequired(p.name),
        unit: cleanOptional(p.unit) ?? 'ora',
        hourlyRate: Number(p.hourlyRate),
        currency: (p.currency as any) ?? 'RON',
        active: p.active == null ? true : Boolean(p.active),
        notes: cleanOptional(p.notes),
      },
    });
    res.status(201).json(created);
  } catch (error: any) {
    if (isPrismaError(error) && error.code === 'P2002') return res.status(409).json({ error: 'Linie duplicată pentru această calificare' });
    console.error('POST /qualifications/:id/labor-lines error:', error);
    res.status(500).json({ error: 'Nu am putut crea linia de manoperă' });
  }
});

// PUT /labor-lines/:lineId
app.put('/labor-lines/:lineId', async (req, res) => {
  const { lineId } = req.params;
  const p = (req.body || {}) as LaborLinePayload;
  if (!p.name || p.hourlyRate == null) return res.status(400).json({ error: 'Denumire și tarif orar sunt obligatorii' });
  try {
    const updated = await (prisma as any).laborLine.update({
      where: { id: lineId },
      data: {
        name: cleanRequired(p.name),
        unit: cleanOptional(p.unit) ?? 'ora',
        hourlyRate: Number(p.hourlyRate),
        currency: (p.currency as any) ?? 'RON',
        active: p.active == null ? true : Boolean(p.active),
        notes: cleanOptional(p.notes),
      },
    });
    res.json(updated);
  } catch (error: any) {
    if (isPrismaError(error) && error.code === 'P2002') return res.status(409).json({ error: 'Linie duplicată pentru această calificare' });
    console.error('PUT /labor-lines/:lineId error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza linia de manoperă' });
  }
});

// DELETE /labor-lines/:lineId
app.delete('/labor-lines/:lineId', async (req, res) => {
  const { lineId } = req.params;
  try {
    await (prisma as any).laborLine.delete({ where: { id: lineId } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /labor-lines/:lineId error:', error);
    res.status(500).json({ error: 'Nu am putut șterge linia de manoperă' });
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
  normaEuro?: 'EURO_3' | 'EURO_4' | 'EURO_5' | 'EURO_6' | null;
  status?: 'ACTIV' | 'IN_REPARATIE' | 'RETRAS' | 'VANDUT' | null;
  expItp?: string | null;  // 'YYYY-MM-DD' or ISO
  expRca?: string | null;
  expRovi?: string | null;
  expCasco?: string | null;
  // legacy tire fields kept for backwards compatibility
  tiresChangedAt?: string | null;
  tiresGood?: boolean | null;
  // seasonal tire fields
  winterTiresChangedAt?: string | null;
  winterTiresGood?: boolean | null;
  winterTireName?: string | null;
  winterTireDimensions?: string | null;
  summerTiresChangedAt?: string | null;
  summerTiresGood?: boolean | null;
  summerTireName?: string | null;
  summerTireDimensions?: string | null;
  itpDocument?: string | null;
  rcaDocument?: string | null;
  vinietaDocument?: string | null;
  cascoDocument?: string | null;
  rcaDecontareDirecta?: boolean | null;
};

type CarTireHistoryPayload = {
  season?: 'WINTER' | 'SUMMER';
  changedAt?: string | null;
  isGood?: boolean | null;
  tireName?: string | null;
  tireDimensions?: string | null;
  note?: string | null;
};

type CarDocumentType = 'RCA' | 'CASCO' | 'VINIETA' | 'ITP';
type CarDocumentField = 'rcaDocument' | 'cascoDocument' | 'vinietaDocument' | 'itpDocument';

const CAR_DOCUMENT_FIELD_BY_TYPE: Record<CarDocumentType, CarDocumentField> = {
  RCA: 'rcaDocument',
  CASCO: 'cascoDocument',
  VINIETA: 'vinietaDocument',
  ITP: 'itpDocument',
};

const CAR_DOCUMENT_UPLOAD_DIR = path.join(__dirname, '../uploads/car-documents');
const CAR_DOCUMENT_ALLOWED_EXT = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
  'webp',
]);

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

const sameNullableDate = (a: Date | null | undefined, b: Date | null | undefined) =>
  (a ? a.getTime() : null) === (b ? b.getTime() : null);

const normalizeCarDocumentType = (value: string | undefined): CarDocumentType | null => {
  const upper = String(value || '').trim().toUpperCase();
  if (upper === 'RCA' || upper === 'CASCO' || upper === 'VINIETA' || upper === 'ITP') return upper;
  return null;
};

const carDocumentFieldForType = (type: CarDocumentType): CarDocumentField => CAR_DOCUMENT_FIELD_BY_TYPE[type];

const ensureCarUploadDir = () => {
  if (!fs.existsSync(CAR_DOCUMENT_UPLOAD_DIR)) {
    fs.mkdirSync(CAR_DOCUMENT_UPLOAD_DIR, { recursive: true });
  }
};

const sanitizeUploadBasename = (filename: string) =>
  path
    .basename(filename, path.extname(filename))
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'document';

const removeCarUploadedFile = (storedPath?: string | null) => {
  if (!storedPath) return;
  const relativePath = String(storedPath).replace(/^\/+/, '');
  const fullPath = path.join(__dirname, '..', relativePath);
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (error: unknown) {
    console.warn('Could not remove uploaded car document:', fullPath, error);
  }
};

const carDocumentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureCarUploadDir();
    cb(null, CAR_DOCUMENT_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const docType = normalizeCarDocumentType(req.params.type)?.toUpperCase() || 'DOC';
    const ext = path.extname(file.originalname).toLowerCase();
    // Use license plate passed as query param, fall back to car id
    const rawPlate = String((req.query as Record<string, string>).placute || req.params.id || 'auto');
    const plate = rawPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = Date.now().toString(36).toUpperCase();
    cb(null, `${plate}_${docType}_${dateStr}_${shortId}${ext}`);
  },
});

const carDocumentUpload = multer({
  storage: carDocumentStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (CAR_DOCUMENT_ALLOWED_EXT.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error('Tip de fișier invalid. Permise: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, WEBP'));
  },
});

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

    const legacyTiresChangedAt = optDate(p.tiresChangedAt);
    const legacyTiresGood = p.tiresGood != null ? toBool(p.tiresGood) : true;
    const winterTiresChangedAt = p.winterTiresChangedAt !== undefined ? optDate(p.winterTiresChangedAt) : legacyTiresChangedAt;
    const summerTiresChangedAt = p.summerTiresChangedAt !== undefined ? optDate(p.summerTiresChangedAt) : legacyTiresChangedAt;
    const winterTiresGood = p.winterTiresGood != null ? toBool(p.winterTiresGood) : legacyTiresGood;
    const summerTiresGood = p.summerTiresGood != null ? toBool(p.summerTiresGood) : legacyTiresGood;
    const winterTireName = opt(p.winterTireName);
    const winterTireDimensions = opt(p.winterTireDimensions);
    const summerTireName = opt(p.summerTireName);
    const summerTireDimensions = opt(p.summerTireDimensions);

    const created = await (prisma as any).car.create({
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
        normaEuro: p.normaEuro ?? null,
        status: p.status ?? 'ACTIV',
        expItp: optDate(p.expItp),
        expRca: optDate(p.expRca),
        expRovi: optDate(p.expRovi),
        expCasco: optDate(p.expCasco),
        tiresChangedAt: winterTiresChangedAt ?? summerTiresChangedAt ?? legacyTiresChangedAt,
        tiresGood: winterTiresGood ?? summerTiresGood ?? legacyTiresGood,
        winterTiresChangedAt,
        winterTiresGood,
        winterTireName,
        winterTireDimensions,
        summerTiresChangedAt,
        summerTiresGood,
        summerTireName,
        summerTireDimensions,
        rcaDecontareDirecta: p.rcaDecontareDirecta != null ? toBool(p.rcaDecontareDirecta) : false,
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

    const legacyPayloadDate = p.tiresChangedAt !== undefined ? optDate(p.tiresChangedAt) : undefined;
    const legacyPayloadGood = p.tiresGood !== undefined
      ? (p.tiresGood == null ? null : toBool(p.tiresGood))
      : undefined;

    const existingLegacyDate = (exists as any).tiresChangedAt as Date | null;
    const existingLegacyGood = (exists as any).tiresGood as boolean | null;

    const existingWinterDate = ((exists as any).winterTiresChangedAt as Date | null) ?? existingLegacyDate;
    const existingWinterGood = ((exists as any).winterTiresGood as boolean | null) ?? existingLegacyGood;
    const existingWinterName = ((exists as any).winterTireName as string | null) ?? null;
    const existingWinterDimensions = ((exists as any).winterTireDimensions as string | null) ?? null;
    const existingSummerDate = ((exists as any).summerTiresChangedAt as Date | null) ?? existingLegacyDate;
    const existingSummerGood = ((exists as any).summerTiresGood as boolean | null) ?? existingLegacyGood;
    const existingSummerName = ((exists as any).summerTireName as string | null) ?? null;
    const existingSummerDimensions = ((exists as any).summerTireDimensions as string | null) ?? null;

    const winterTiresChangedAt = p.winterTiresChangedAt !== undefined
      ? optDate(p.winterTiresChangedAt)
      : (legacyPayloadDate !== undefined ? legacyPayloadDate : existingWinterDate);
    const winterTiresGood = p.winterTiresGood !== undefined
      ? (p.winterTiresGood == null ? null : toBool(p.winterTiresGood))
      : (legacyPayloadGood !== undefined ? legacyPayloadGood : existingWinterGood);

    const summerTiresChangedAt = p.summerTiresChangedAt !== undefined
      ? optDate(p.summerTiresChangedAt)
      : (legacyPayloadDate !== undefined ? legacyPayloadDate : existingSummerDate);
    const summerTiresGood = p.summerTiresGood !== undefined
      ? (p.summerTiresGood == null ? null : toBool(p.summerTiresGood))
      : (legacyPayloadGood !== undefined ? legacyPayloadGood : existingSummerGood);

    const winterTireName = p.winterTireName !== undefined ? opt(p.winterTireName) : existingWinterName;
    const winterTireDimensions = p.winterTireDimensions !== undefined ? opt(p.winterTireDimensions) : existingWinterDimensions;
    const summerTireName = p.summerTireName !== undefined ? opt(p.summerTireName) : existingSummerName;
    const summerTireDimensions = p.summerTireDimensions !== undefined ? opt(p.summerTireDimensions) : existingSummerDimensions;

    const tireHistoryEntries: Array<{
      season: 'WINTER' | 'SUMMER';
      changedAt: Date | null;
      isGood: boolean | null;
      tireName: string | null;
      tireDimensions: string | null;
    }> = [];

    const winterChanged = !sameNullableDate(existingWinterDate, winterTiresChangedAt)
      || (existingWinterGood ?? null) !== (winterTiresGood ?? null)
      || (existingWinterName ?? null) !== (winterTireName ?? null)
      || (existingWinterDimensions ?? null) !== (winterTireDimensions ?? null);
    const winterOldSetExists =
      existingWinterDate != null
      || existingWinterGood != null
      || Boolean(existingWinterName)
      || Boolean(existingWinterDimensions);
    if (winterChanged && winterOldSetExists) {
      tireHistoryEntries.push({
        season: 'WINTER',
        changedAt: existingWinterDate,
        isGood: existingWinterGood ?? null,
        tireName: existingWinterName ?? null,
        tireDimensions: existingWinterDimensions ?? null,
      });
    }

    const summerChanged = !sameNullableDate(existingSummerDate, summerTiresChangedAt)
      || (existingSummerGood ?? null) !== (summerTiresGood ?? null)
      || (existingSummerName ?? null) !== (summerTireName ?? null)
      || (existingSummerDimensions ?? null) !== (summerTireDimensions ?? null);
    const summerOldSetExists =
      existingSummerDate != null
      || existingSummerGood != null
      || Boolean(existingSummerName)
      || Boolean(existingSummerDimensions);
    if (summerChanged && summerOldSetExists) {
      tireHistoryEntries.push({
        season: 'SUMMER',
        changedAt: existingSummerDate,
        isGood: existingSummerGood ?? null,
        tireName: existingSummerName ?? null,
        tireDimensions: existingSummerDimensions ?? null,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await (tx as any).car.update({
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
          normaEuro: p.normaEuro ?? null,
          status: p.status ?? 'ACTIV',
          expItp: optDate(p.expItp),
          expRca: optDate(p.expRca),
          expRovi: optDate(p.expRovi),
          expCasco: optDate(p.expCasco),
          tiresChangedAt: winterTiresChangedAt ?? summerTiresChangedAt ?? null,
          tiresGood: winterTiresGood ?? summerTiresGood ?? null,
          winterTiresChangedAt,
          winterTiresGood,
          winterTireName,
          winterTireDimensions,
          summerTiresChangedAt,
          summerTiresGood,
          summerTireName,
          summerTireDimensions,
          rcaDecontareDirecta: p.rcaDecontareDirecta != null ? toBool(p.rcaDecontareDirecta) : false,
        },
        include: { driver: { select: { id: true, name: true } } },
      });

      for (const entry of tireHistoryEntries) {
        await (tx as any).carTireHistory.create({
          data: {
            carId: id,
            season: entry.season,
            changedAt: entry.changedAt,
            isGood: entry.isGood,
            tireName: entry.tireName,
            tireDimensions: entry.tireDimensions,
          },
        });
      }

      return result;
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

// POST /cars/:id/upload-document/:type
app.post('/cars/:id/upload-document/:type', (req, res) => {
  carDocumentUpload.single('file')(req, res, async (uploadError: any) => {
    if (uploadError) {
      if (uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Fișierul este prea mare. Limita este 50MB.' });
      }
      return res.status(400).json({ error: uploadError?.message || 'Nu am putut procesa fișierul' });
    }

    const { id } = req.params;
    const docType = normalizeCarDocumentType(req.params.type);

    if (!docType) {
      if (req.file) removeCarUploadedFile(`/uploads/car-documents/${req.file.filename}`);
      return res.status(400).json({ error: 'Tip document invalid. Folosește: RCA, CASCO, VINIETA, ITP' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Fișierul este obligatoriu' });
    }

    try {
      const exists = await (prisma as any).car.findUnique({ where: { id } });
      if (!exists) {
        removeCarUploadedFile(`/uploads/car-documents/${req.file.filename}`);
        return res.status(404).json({ error: 'Mașina nu a fost găsită' });
      }

      const documentField = carDocumentFieldForType(docType);
      const oldPath = (exists as any)[documentField] as string | null;
      const newPath = `/uploads/car-documents/${req.file.filename}`;

      const updated = await (prisma as any).car.update({
        where: { id },
        data: { [documentField]: newPath },
        include: { driver: { select: { id: true, name: true } } },
      });

      // Save to history instead of deleting old file
      await (prisma as any).carDocumentHistory.create({
        data: {
          carId: id,
          docType,
          path: newPath,
          filename: req.file.filename,
        },
      });

      res.json(updated);
    } catch (error: unknown) {
      removeCarUploadedFile(`/uploads/car-documents/${req.file.filename}`);
      console.error('POST /cars/:id/upload-document/:type error:', error);
      res.status(500).json({ error: 'Nu am putut încărca documentul' });
    }
  });
});

// DELETE /cars/:id/document/:type
app.delete('/cars/:id/document/:type', async (req, res) => {
  const { id } = req.params;
  const docType = normalizeCarDocumentType(req.params.type);

  if (!docType) {
    return res.status(400).json({ error: 'Tip document invalid. Folosește: RCA, CASCO, VINIETA, ITP' });
  }

  try {
    const exists = await (prisma as any).car.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Mașina nu a fost găsită' });

    const documentField = carDocumentFieldForType(docType);
    const oldPath = (exists as any)[documentField] as string | null;

    const updated = await (prisma as any).car.update({
      where: { id },
      data: { [documentField]: null },
      include: { driver: { select: { id: true, name: true } } },
    });

    if (oldPath) removeCarUploadedFile(oldPath);
    res.json(updated);
  } catch (error: unknown) {
    console.error('DELETE /cars/:id/document/:type error:', error);
    res.status(500).json({ error: 'Nu am putut șterge documentul' });
  }
});

// GET /cars/:id/document-history
app.get('/cars/:id/document-history', async (req, res) => {
  const { id } = req.params;
  try {
    const history = await (prisma as any).carDocumentHistory.findMany({
      where: { carId: id },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(history);
  } catch (error: unknown) {
    console.error('GET /cars/:id/document-history error:', error);
    res.status(500).json({ error: 'Nu am putut încărca istoricul documentelor' });
  }
});

// GET /cars/:id/tire-history
app.get('/cars/:id/tire-history', async (req, res) => {
  const { id } = req.params;
  try {
    const history = await (prisma as any).carTireHistory.findMany({
      where: { carId: id },
      orderBy: { replacedAt: 'desc' },
    });
    res.json(history);
  } catch (error: unknown) {
    console.error('GET /cars/:id/tire-history error:', error);
    res.status(500).json({ error: 'Nu am putut încărca istoricul anvelopelor' });
  }
});

// PUT /cars/:id/tire-history/:historyId
app.put('/cars/:id/tire-history/:historyId', async (req, res) => {
  const { id, historyId } = req.params;
  const payload: CarTireHistoryPayload = req.body || {};

  if (payload.season !== undefined && payload.season !== 'WINTER' && payload.season !== 'SUMMER') {
    return res.status(400).json({ error: 'Sezon invalid. Folosește WINTER sau SUMMER.' });
  }

  try {
    const entry = await (prisma as any).carTireHistory.findUnique({ where: { id: historyId } });
    if (!entry || entry.carId !== id) {
      return res.status(404).json({ error: 'Intrarea din istoric nu a fost găsită' });
    }

    const updated = await (prisma as any).carTireHistory.update({
      where: { id: historyId },
      data: {
        season: payload.season ?? entry.season,
        changedAt: payload.changedAt !== undefined ? optDate(payload.changedAt) : entry.changedAt,
        isGood: payload.isGood !== undefined ? (payload.isGood == null ? null : toBool(payload.isGood)) : entry.isGood,
        tireName: payload.tireName !== undefined ? opt(payload.tireName) : entry.tireName,
        tireDimensions: payload.tireDimensions !== undefined ? opt(payload.tireDimensions) : entry.tireDimensions,
        note: payload.note !== undefined ? opt(payload.note) : entry.note,
      },
    });

    res.json(updated);
  } catch (error: unknown) {
    console.error('PUT /cars/:id/tire-history/:historyId error:', error);
    res.status(500).json({ error: 'Nu am putut actualiza intrarea de anvelope' });
  }
});

// DELETE /cars/:id/tire-history/:historyId
app.delete('/cars/:id/tire-history/:historyId', async (req, res) => {
  const { id, historyId } = req.params;

  try {
    const entry = await (prisma as any).carTireHistory.findUnique({ where: { id: historyId } });
    if (!entry || entry.carId !== id) {
      return res.status(404).json({ error: 'Intrarea din istoric nu a fost găsită' });
    }

    await (prisma as any).carTireHistory.delete({ where: { id: historyId } });
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error('DELETE /cars/:id/tire-history/:historyId error:', error);
    res.status(500).json({ error: 'Nu am putut șterge intrarea de anvelope' });
  }
});

// DELETE /cars/:id/document-history/:historyId
app.delete('/cars/:id/document-history/:historyId', async (req, res) => {
  const { historyId } = req.params;
  try {
    const entry = await (prisma as any).carDocumentHistory.findUnique({ where: { id: historyId } });
    if (!entry) return res.status(404).json({ error: 'Înregistrare inexistentă' });
    await (prisma as any).carDocumentHistory.delete({ where: { id: historyId } });
    removeCarUploadedFile(entry.path);
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error('DELETE /cars/:id/document-history/:historyId error:', error);
    res.status(500).json({ error: 'Nu am putut șterge înregistrarea' });
  }
});

// DELETE /cars/:id
app.delete('/cars/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await (prisma as any).car.findUnique({
      where: { id },
      select: {
        id: true,
        itpDocument: true,
        rcaDocument: true,
        vinietaDocument: true,
        cascoDocument: true,
      },
    });
    if (!exists) return res.status(404).json({ error: 'Mașina nu a fost găsită' });

    await prisma.car.delete({ where: { id } });
    removeCarUploadedFile(exists.itpDocument);
    removeCarUploadedFile(exists.rcaDocument);
    removeCarUploadedFile(exists.vinietaDocument);
    removeCarUploadedFile(exists.cascoDocument);
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /cars/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge mașina' });
  }
});

/* ===================== FURNIZORI (Suppliers) ===================== */

type SupplierPayload = {
  id_tert?: string | null;
  denumire: string;
  cui_cif: string;
  nrRegCom?: string | null;
  den_catart?: string | null;
  tva: boolean;
  tvaData?: string | null; // ISO
  adresa: string;
  oras: string;
  judet: string;
  tara: string;
  contactNume?: string | null;
  email?: string | null;
  telefon?: string | null;
  site?: string | null;
  metodaPlata: string;
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
  "denumire","cui_cif","adresa","oras","judet","tara",
  "metodaPlata","status",
  ];
  for (const k of required) {
    if (!p[k as keyof SupplierPayload]) return res.status(400).json({ error: `Câmpul '${k}' este obligatoriu` });
  }

  try {
    const created = await prisma.furnizor.create({
      data: {
    id_tert: cleanOptional(p.id_tert),
        denumire: cleanRequired(p.denumire),
        cui_cif: cleanRequired(p.cui_cif),
        nrRegCom: cleanOptional(p.nrRegCom),
        den_catart: cleanOptional(p.den_catart),
        tva: toBool(p.tva),
        tvaData: toBool(p.tva) ? optDate2(p.tvaData) : null,
        adresa: cleanRequired(p.adresa),
        oras: cleanRequired(p.oras),
        judet: cleanRequired(p.judet),
        tara: cleanRequired(p.tara),
  contactNume: cleanOptional(p.contactNume),
  email: cleanOptional(p.email),
  telefon: cleanOptional(p.telefon),
        site: cleanOptional(p.site),
  metodaPlata: cleanRequired(p.metodaPlata),
  contBancar: cleanOptional(p.contBancar),
  banca: cleanOptional(p.banca),
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
  id_tert: cleanOptional(p.id_tert),
        denumire: cleanRequired(p.denumire),
        cui_cif: cleanRequired(p.cui_cif),
        nrRegCom: cleanOptional(p.nrRegCom),
        den_catart: cleanOptional(p.den_catart),
        tva: toBool(p.tva),
        tvaData: toBool(p.tva) ? optDate2(p.tvaData) : null,
        adresa: cleanRequired(p.adresa),
        oras: cleanRequired(p.oras),
        judet: cleanRequired(p.judet),
        tara: cleanRequired(p.tara),
  contactNume: cleanOptional(p.contactNume),
  email: cleanOptional(p.email),
  telefon: cleanOptional(p.telefon),
        site: cleanOptional(p.site),
  metodaPlata: cleanRequired(p.metodaPlata),
  contBancar: cleanOptional(p.contBancar),
  banca: cleanOptional(p.banca),
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

// DELETE /furnizori/:id
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

// GET /operations - Fetch all operations across all categories
app.get("/operations", async (_req, res) => {
  try {
    const ops = await prisma.operation.findMany({ 
      orderBy: { name: "asc" },
      include: { category: { select: { name: true } } }
    });
    res.json(ops);
  } catch (error: unknown) {
    console.error("GET /operations error:", error);
    res.status(500).json({ error: "Nu am putut încărca operațiile" });
  }
});

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
    // Use raw query with COALESCE for status to tolerate existing NULL values in DB
    const list = await (prisma as any).$queryRaw`
      SELECT id, category, code, description,
             COALESCE(status, '') AS status,
             "serialNumber", "referenceNumber", "lastRepairDate",
             "repairCost", "repairCount", warranty, "equipmentNumber",
             generation, "purchasePrice", "hourlyCost", "createdAt", "updatedAt"
      FROM "Equipment"
      ORDER BY category ASC, code ASC;
    `;
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

/* ===================== PURCHASE ORDERS (Comenzi) ===================== */

type POItemInput = {
  name: string;
  category?: string | null;
  sku?: string | null;
  unit?: string | null;
  qtyOrdered: number;
  unitPrice?: number;
  currency?: string | null;
  vatPercent?: number | null;
  discountPercent?: number | null;
  promisedDate?: string | null;
};

type POCreatePayload = {
  poNumber?: string; // optional; auto-generate if missing
  orderDate?: string;
  requestedBy?: string;
  orderedBy?: string;
  supplierId?: string;
  supplierContactName?: string;
  supplierContactPhone?: string;
  supplierContactEmail?: string;
  projectId?: string;
  deliveryAddress?: string;
  priority?: string;
  status?: string;
  notes?: string;
  promisedDeliveryDate?: string;
  currency?: string;
  exchangeRate?: number;
  items: POItemInput[];
};

// Helper to generate next PO number using MAX existing sequence (avoids reuse after deletions)
async function generateNextPONumber() {
  const y = new Date().getFullYear();
  const prefix = `TOPAZ-PO-${y}-`;
  const last = await (prisma as any).purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
    select: { poNumber: true }
  });
  let next = 1;
  if (last?.poNumber) {
    const m = last.poNumber.match(/(\d{5})$/);
    if (m) next = Number(m[1]) + 1;
  }
  return prefix + String(next).padStart(5, '0');
}

// GET /orders
app.get('/orders', async (_req, res) => {
  try {
    const list = await (prisma as any).purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { allocations: true } } },
      take: 200,
    });
    res.json(list);
  } catch (error) {
    console.error('GET /orders error:', error);
    res.status(500).json({ error: 'Nu am putut încărca comenzile' });
  }
});

// POST /orders
app.post('/orders', async (req, res) => {
  const p = (req.body || {}) as POCreatePayload;
  if (!p.items || !Array.isArray(p.items) || p.items.length === 0) {
    return res.status(400).json({ error: 'Cel puțin o linie este necesară' });
  }
  try {
  const orderDate = p.orderDate ? new Date(p.orderDate) : new Date();
    const allowedStatuses = new Set([
      'DRAFT',
      'WAITING_APPROVAL',
      'APPROVED',
      'ORDERED',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
      'CLOSED',
      'CANCELLED',
      'SUPPLIER_OUT_OF_STOCK',
      'UNPAID_ORDER',
      'PAID_FULL_ORDER',
      'PAID_PARTIAL_ORDER',
      'IN_DELIVERY',
      'RETURNED_REFUSED',
    ]);
    const requestedStatus = typeof p.status === 'string' ? p.status.trim().toUpperCase() : undefined;
    const desiredStatus = requestedStatus && allowedStatuses.has(requestedStatus) ? requestedStatus : undefined;
  // Generate / retry logic to avoid 409 on concurrent inserts
    let attempts = 0; let created: any; let lastError: any; let poNumber = p.poNumber?.trim();
    while (attempts < 5) {
      if (!poNumber) poNumber = await generateNextPONumber();
      try {
        created = await (prisma as any).purchaseOrder.create({
          data: {
            poNumber,
            orderDate,
            requestedBy: cleanOptional(p.requestedBy),
            orderedBy: cleanOptional(p.orderedBy),
            supplierId: cleanOptional(p.supplierId),
            supplierContactName: cleanOptional(p.supplierContactName),
            supplierContactPhone: cleanOptional(p.supplierContactPhone),
            supplierContactEmail: cleanOptional(p.supplierContactEmail),
            projectId: cleanOptional(p.projectId),
            deliveryAddress: cleanOptional(p.deliveryAddress),
            priority: (p.priority?.toUpperCase() as any) || 'MEDIUM',
            ...(desiredStatus ? { status: desiredStatus } : {}),
            notes: cleanOptional(p.notes),
            promisedDeliveryDate: p.promisedDeliveryDate ? new Date(p.promisedDeliveryDate) : null,
            currency: (p.currency as any) || 'RON',
            exchangeRate: p.exchangeRate ?? null,
            items: {
              create: p.items.map(i => ({
                name: cleanRequired(i.name),
                category: cleanOptional(i.category),
                sku: cleanOptional(i.sku),
                unit: cleanOptional(i.unit),
                qtyOrdered: Number(i.qtyOrdered),
                unitPrice: Number(i.unitPrice ?? 0),
                currency: (i.currency as any) || null,
                vatPercent: i.vatPercent ?? null,
                discountPercent: i.discountPercent ?? null,
                promisedDate: i.promisedDate ? new Date(i.promisedDate) : null,
              }))
            }
          },
          include: { items: true }
        });
        break; // success
      } catch (err: any) {
        if (isPrismaError(err) && err.code === 'P2002' && !p.poNumber) {
          // regenerate and retry
            poNumber = undefined;
            attempts++;
            lastError = err;
            continue;
        }
        lastError = err;
        break;
      }
    }
    if (!created) {
      if (isPrismaError(lastError) && (lastError as any).code === 'P2002') {
        return res.status(409).json({ error: 'Număr de comandă deja folosit (după 5 încercări)' });
      }
      throw lastError;
    }
    res.status(201).json(created);
  } catch (error) {
    if (isPrismaError(error) && (error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Număr de comandă deja folosit' });
    }
    console.error('POST /orders error:', error);
    res.status(500).json({ error: 'Nu am putut crea comanda' });
  }
});

// GET /orders/:id (include allocations & distributions)
app.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await (prisma as any).purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { allocations: true, invoiceDistributions: true } },
        receipts: { include: { items: { include: { project: true } } } },
        invoices: { include: { distributions: true } },
        payments: true,
        project: true,
      }
    });
    if (!order) return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    res.json(order);
  } catch (error) {
    console.error('GET /orders/:id error:', error);
    res.status(500).json({ error: 'Nu am putut încărca comanda' });
  }
});

// PATCH /orders/:id/status { status }
app.patch('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Status lipsă' });
  try {
    const updated = await (prisma as any).purchaseOrder.update({ where: { id }, data: { status } });
    // add event
    await (prisma as any).purchaseOrderEvent.create({ data: { orderId: id, type: 'STATUS_CHANGE', message: `Status: ${status}` } });
    res.json(updated);
  } catch (error) {
    console.error('PATCH /orders/:id/status error:', error);
    res.status(500).json({ error: 'Nu am putut modifica statusul' });
  }
});

// POST /orders/:id/items (add additional line)
app.post('/orders/:id/items', async (req, res) => {
  const { id } = req.params;
  const i = (req.body || {}) as POItemInput;
  if (!i.name || i.qtyOrdered == null) return res.status(400).json({ error: 'Denumire și cantitate obligatorii' });
  try {
    const exists = await (prisma as any).purchaseOrder.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    const created = await (prisma as any).purchaseOrderItem.create({
      data: {
        orderId: id,
        name: cleanRequired(i.name),
        category: cleanOptional(i.category),
        sku: cleanOptional(i.sku),
        unit: cleanOptional(i.unit),
        qtyOrdered: Number(i.qtyOrdered),
        unitPrice: Number(i.unitPrice ?? 0),
        currency: (i.currency as any) || null,
        vatPercent: i.vatPercent ?? null,
        discountPercent: i.discountPercent ?? null,
        promisedDate: i.promisedDate ? new Date(i.promisedDate) : null,
      }
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /orders/:id/items error:', error);
    res.status(500).json({ error: 'Nu am putut adăuga linia' });
  }
});

// DELETE /orders/:id
app.delete('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await (prisma as any).purchaseOrder.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    await (prisma as any).purchaseOrder.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /orders/:id error:', error);
    res.status(500).json({ error: 'Nu am putut șterge comanda' });
  }
});

// ----- Helpers for aggregates & payment status -----
async function recalcOrderAggregates(orderId: string) {
  const items = await (prisma as any).purchaseOrderItem.findMany({ where: { orderId } });
  let subTotal = 0;
  let totalVat = 0;
  let totalOrderedQty = 0;
  let totalReceivedQty = 0;
  for (const it of items) {
    const qty = Number(it.qtyOrdered) || 0;
    const received = Number(it.qtyReceived) || 0;
    const price = Number(it.unitPrice) || 0;
    const discount = it.discountPercent ? (1 - it.discountPercent / 100) : 1;
    const lineNet = qty * price * discount;
    const vat = it.vatPercent ? lineNet * (it.vatPercent / 100) : 0;
    subTotal += lineNet;
    totalVat += vat;
    totalOrderedQty += qty;
    totalReceivedQty += received;
  }
  const totalGross = subTotal + totalVat;
  const receivedPercent = totalOrderedQty > 0 ? (totalReceivedQty / totalOrderedQty) * 100 : 0;
  // update status if fully received
  let statusUpdate: any = {};
  if (receivedPercent > 0) {
    statusUpdate.status = receivedPercent >= 99.999 ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
  }
  await (prisma as any).purchaseOrder.update({
    where: { id: orderId },
    data: { subTotal, totalVat, totalGross, receivedPercent, ...statusUpdate }
  });
  return { subTotal, totalVat, totalGross, receivedPercent };
}

async function updatePaymentStatus(orderId: string) {
  const invoices = await (prisma as any).purchaseInvoice.findMany({ where: { orderId } });
  const payments = await (prisma as any).purchasePayment.findMany({ where: { orderId } });
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  let paymentStatus: string = 'UNPAID';
  if (totalPaid > 0 && totalPaid < totalInvoiced) paymentStatus = 'PARTIAL';
  if (totalInvoiced > 0 && Math.abs(totalPaid - totalInvoiced) < 0.01) paymentStatus = 'PAID';
  // OVERDUE detection would need due date; skip for now.
  await (prisma as any).purchaseOrder.update({ where: { id: orderId }, data: { paymentStatus } });
  return { totalInvoiced, totalPaid, paymentStatus };
}

// POST /orders/:id/recalc
app.post('/orders/:id/recalc', async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await (prisma as any).purchaseOrder.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    const agg = await recalcOrderAggregates(id);
    res.json(agg);
  } catch (error) {
    console.error('POST /orders/:id/recalc error:', error);
    res.status(500).json({ error: 'Nu am putut recalcula totalurile' });
  }
});

// ----- Receipts -----
type ReceiptItemInput = { orderItemId: string; quantity: number; damagedQuantity?: number; returnQuantity?: number; note?: string; projectId?: string };
type ReceiptPayload = { deliveredDate?: string; transporter?: string; awb?: string; tracking?: string; note?: string; items: ReceiptItemInput[] };

// POST /orders/:id/receipts
app.post('/orders/:id/receipts', async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as ReceiptPayload;
  if (!p.items || !Array.isArray(p.items) || p.items.length === 0) return res.status(400).json({ error: 'Cel puțin o linie de recepție' });
  try {
    const order = await (prisma as any).purchaseOrder.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    const receipt = await (prisma as any).purchaseReceipt.create({
      data: {
        orderId: id,
        deliveredDate: p.deliveredDate ? new Date(p.deliveredDate) : null,
        transporter: cleanOptional(p.transporter),
        awb: cleanOptional(p.awb),
        tracking: cleanOptional(p.tracking),
        note: cleanOptional(p.note),
        items: {
          create: p.items.map(it => ({
            orderItemId: it.orderItemId,
            quantity: Number(it.quantity || 0),
            damagedQuantity: it.damagedQuantity ? Number(it.damagedQuantity) : 0,
            returnQuantity: it.returnQuantity ? Number(it.returnQuantity) : 0,
            note: cleanOptional(it.note),
            projectId: cleanOptional(it.projectId)
          }))
        }
      },
      include: { items: true }
    });
    // update received quantities
    for (const ri of receipt.items) {
      await (prisma as any).purchaseOrderItem.update({
        where: { id: ri.orderItemId },
        data: { qtyReceived: { increment: ri.quantity } }
      });
    }
    await recalcOrderAggregates(id);
    await (prisma as any).purchaseOrderEvent.create({ data: { orderId: id, type: 'RECEIPT', message: `Recepție ${receipt.id} creată` } });
    res.status(201).json(receipt);
  } catch (error) {
    console.error('POST /orders/:id/receipts error:', error);
    res.status(500).json({ error: 'Nu am putut înregistra recepția' });
  }
});

// ----- Invoices -----
type InvoicePayload = { number: string; date?: string; valueNet: number; vatValue: number; total: number; currency?: string };
app.post('/orders/:id/invoices', async (req, res) => {
  const { id } = req.params;
  const p = (req.body || {}) as InvoicePayload;
  if (!p.number || p.valueNet == null || p.vatValue == null || p.total == null) return res.status(400).json({ error: 'Număr, valori net/vat/total obligatorii' });
  try {
    const order = await (prisma as any).purchaseOrder.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    const inv = await (prisma as any).purchaseInvoice.create({
      data: {
        orderId: id,
        number: cleanRequired(p.number),
        date: p.date ? new Date(p.date) : new Date(),
        valueNet: Number(p.valueNet),
        vatValue: Number(p.vatValue),
        total: Number(p.total),
        currency: (p.currency as any) || order.currency
      }
    });
    await (prisma as any).purchaseOrderEvent.create({ data: { orderId: id, type: 'INVOICE', message: `Factură ${inv.number}` } });
    await updatePaymentStatus(id);
    res.status(201).json(inv);
  } catch (error) {
    console.error('POST /orders/:id/invoices error:', error);
    res.status(500).json({ error: 'Nu am putut adăuga factura' });
  }
});

// ----- Payments -----
type PaymentPayload = { date?: string; amount: number; method?: string; note?: string };
app.post('/invoices/:invoiceId/payments', async (req, res) => {
  const { invoiceId } = req.params;
  const p = (req.body || {}) as PaymentPayload;
  if (p.amount == null) return res.status(400).json({ error: 'Suma obligatorie' });
  try {
    const invoice = await (prisma as any).purchaseInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ error: 'Factura nu a fost găsită' });
    const pay = await (prisma as any).purchasePayment.create({
      data: {
        invoiceId,
        orderId: invoice.orderId,
        date: p.date ? new Date(p.date) : new Date(),
        amount: Number(p.amount),
        method: (p.method as any) || 'BANK_TRANSFER',
        note: cleanOptional(p.note)
      }
    });
    await (prisma as any).purchaseOrderEvent.create({ data: { orderId: invoice.orderId, type: 'PAYMENT', message: `Plată ${pay.amount}` } });
    await updatePaymentStatus(invoice.orderId);
    res.status(201).json(pay);
  } catch (error) {
    console.error('POST /invoices/:invoiceId/payments error:', error);
    res.status(500).json({ error: 'Nu am putut înregistra plata' });
  }
});

/* ===================== LEAVE POLICY MANAGEMENT ===================== */

// GET /leave-policy - Get company default leave policy
app.get('/leave-policy', async (_req, res) => {
  try {
    const policy = await (prisma as any).leavePolicy.findFirst({
      where: { isCompanyDefault: true },
      include: {
        blackoutPeriods: { orderBy: { startDate: 'asc' } },
        companyShutdowns: { orderBy: { startDate: 'asc' } },
      },
    });
    
    if (!policy) {
      return res.status(404).json({ error: 'No company policy found' });
    }
    
    res.json(policy);
  } catch (error: unknown) {
    console.error('GET /leave-policy error:', error);
    res.status(500).json({ error: 'Could not fetch leave policy' });
  }
});

// PUT /leave-policy/:id - Update leave policy
app.put('/leave-policy/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const {
      name,
      baseAnnualDays,
      seniorityStepYears,
      bonusPerStep,
      accrualMethod,
      roundingMethod,
      allowCarryover,
      maxCarryoverDays,
      carryoverExpiryMonth,
      carryoverExpiryDay,
      maxNegativeBalance,
      maxConsecutiveDays,
      minNoticeDays,
    } = req.body;

    const updated = await (prisma as any).leavePolicy.update({
      where: { id },
      data: {
        name: name || undefined,
        baseAnnualDays: baseAnnualDays != null ? Number(baseAnnualDays) : undefined,
        seniorityStepYears: seniorityStepYears != null ? Number(seniorityStepYears) : undefined,
        bonusPerStep: bonusPerStep != null ? Number(bonusPerStep) : undefined,
        accrualMethod: accrualMethod || undefined,
        roundingMethod: roundingMethod || undefined,
        allowCarryover: allowCarryover != null ? Boolean(allowCarryover) : undefined,
        maxCarryoverDays: maxCarryoverDays != null ? Number(maxCarryoverDays) : undefined,
        carryoverExpiryMonth: carryoverExpiryMonth != null ? Number(carryoverExpiryMonth) : undefined,
        carryoverExpiryDay: carryoverExpiryDay != null ? Number(carryoverExpiryDay) : undefined,
        maxNegativeBalance: maxNegativeBalance != null ? Number(maxNegativeBalance) : undefined,
        maxConsecutiveDays: maxConsecutiveDays != null ? Number(maxConsecutiveDays) : undefined,
        minNoticeDays: minNoticeDays != null ? Number(minNoticeDays) : undefined,
      },
      include: {
        blackoutPeriods: true,
        companyShutdowns: true,
      },
    });

    res.json(updated);
  } catch (error: unknown) {
    console.error('PUT /leave-policy/:id error:', error);
    res.status(500).json({ error: 'Could not update leave policy' });
  }
});

/* ===================== BLACKOUT PERIODS ===================== */

// POST /leave-policy/:policyId/blackout-periods
app.post('/leave-policy/:policyId/blackout-periods', async (req, res) => {
  const { policyId } = req.params;
  try {
    const { startDate, endDate, reason, allowExceptions } = req.body;
    
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'startDate, endDate, and reason are required' });
    }

    const blackout = await (prisma as any).blackoutPeriod.create({
      data: {
        policyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: String(reason),
        allowExceptions: Boolean(allowExceptions ?? false),
      },
    });

    res.status(201).json(blackout);
  } catch (error: unknown) {
    console.error('POST /leave-policy/:policyId/blackout-periods error:', error);
    res.status(500).json({ error: 'Could not create blackout period' });
  }
});

// PUT /blackout-periods/:id
app.put('/blackout-periods/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { startDate, endDate, reason, allowExceptions } = req.body;

    const updated = await (prisma as any).blackoutPeriod.update({
      where: { id },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        reason: reason || undefined,
        allowExceptions: allowExceptions != null ? Boolean(allowExceptions) : undefined,
      },
    });

    res.json(updated);
  } catch (error: unknown) {
    console.error('PUT /blackout-periods/:id error:', error);
    res.status(500).json({ error: 'Could not update blackout period' });
  }
});

// DELETE /blackout-periods/:id
app.delete('/blackout-periods/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await (prisma as any).blackoutPeriod.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /blackout-periods/:id error:', error);
    res.status(500).json({ error: 'Could not delete blackout period' });
  }
});

/* ===================== COMPANY SHUTDOWNS ===================== */

// POST /leave-policy/:policyId/company-shutdowns
app.post('/leave-policy/:policyId/company-shutdowns', async (req, res) => {
  const { policyId } = req.params;
  try {
    const { startDate, endDate, days, reason, deductFromAllowance } = req.body;
    
    if (!startDate || !endDate || !reason || days == null) {
      return res.status(400).json({ error: 'startDate, endDate, days, and reason are required' });
    }

    const shutdown = await (prisma as any).companyShutdown.create({
      data: {
        policyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: Number(days),
        reason: String(reason),
        deductFromAllowance: Boolean(deductFromAllowance ?? true),
      },
    });

    res.status(201).json(shutdown);
  } catch (error: unknown) {
    console.error('POST /leave-policy/:policyId/company-shutdowns error:', error);
    res.status(500).json({ error: 'Could not create company shutdown' });
  }
});

// PUT /company-shutdowns/:id
app.put('/company-shutdowns/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { startDate, endDate, days, reason, deductFromAllowance } = req.body;

    const updated = await (prisma as any).companyShutdown.update({
      where: { id },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        days: days != null ? Number(days) : undefined,
        reason: reason || undefined,
        deductFromAllowance: deductFromAllowance != null ? Boolean(deductFromAllowance) : undefined,
      },
    });

    res.json(updated);
  } catch (error: unknown) {
    console.error('PUT /company-shutdowns/:id error:', error);
    res.status(500).json({ error: 'Could not update company shutdown' });
  }
});

// DELETE /company-shutdowns/:id
app.delete('/company-shutdowns/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await (prisma as any).companyShutdown.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('DELETE /company-shutdowns/:id error:', error);
    res.status(500).json({ error: 'Could not delete company shutdown' });
  }
});



/* ===================== BOOT ===================== */

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

(async () => {
  try {
    await prisma.$connect();
  console.log('Prisma connected to DB');
    console.log('DB URL:', process.env.DATABASE_URL);
    await ensureOrderStatusEnum();
    app.listen(PORT, HOST, () =>
      console.log(`API running on http://${HOST}:${PORT}`)
    );
  } catch (error: unknown) {
  console.error('Prisma failed to connect:', error);
    process.exit(1);
  }
})();


