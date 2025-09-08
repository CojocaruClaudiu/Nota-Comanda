// src/utils/leaveDocuments.ts
import dayjs from "dayjs";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { businessEndDate } from "./businessDays";

// Pretty RO date (DD.MM.YYYY)
export const dmyDot = (iso?: string) =>
  iso && dayjs(iso).isValid() ? dayjs(iso).format("DD.MM.YYYY") : "—";

type LeaveDocOpts = {
  employeeName: string;

  // Personal details (optional but recommended)
  cnp?: string;
  county?: string;        // ex: "Prahova"
  locality?: string;      // ex: "sat Novăcești (com. Florești)" OR "Băicoi"
  address?: string;       // ex: "nr. 295" or full street

  idSeries?: string;      // ex: "PX"
  idNumber?: string;      // ex: "821461"
  idIssuer?: string;      // ex: "SPCLEP Băicoi"
  idIssueDateISO?: string;// ex: "2021-09-29"

  // Leave info
  startISO: string;       // inclusive
  days: number;           // business days
  note?: string;

  // Company (defaults for Topaz)
  companyName?: string;   // default: "S.C. TOPAZ CONSTRUCT S.R.L."
  companyCity?: string;   // default: "Băicoi"
};

function buildSentence(opts: LeaveDocOpts) {
  const {
    employeeName, county, locality, address,
    idSeries, idNumber, idIssuer, idIssueDateISO, cnp,
    startISO, days,
    companyName = "S.C. TOPAZ CONSTRUCT S.R.L.",
    companyCity = "Băicoi",
  } = opts;

  // end (inclusive) = businessEndDate (exclusive) - 1 day
  const endExclusive = businessEndDate(startISO, days);
  const endInclusiveISO = dayjs(endExclusive).subtract(1, "day").format("YYYY-MM-DD");

  const addressPart = [
    county ? `județul ${county}` : null,
    locality || null,
    address || null,
  ].filter(Boolean).join(", ");

  const idPart = [
    (idSeries || idNumber) ? `seria ${idSeries ?? ""}${idSeries && idNumber ? ", " : ""}${idNumber ? `nr. ${idNumber}` : ""}` : null,
    idIssuer ? `eliberată de ${idIssuer}` : null,
    idIssueDateISO ? `la data de ${dmyDot(idIssueDateISO)}` : null,
  ].filter(Boolean).join(", ");

  const identity = [
    `Subsemnatul, ${employeeName}`,
    addressPart ? `domiciliat în ${addressPart}` : null,
    idPart ? `posesor al cărții de identitate ${idPart}` : null,
    cnp ? `CNP ${cnp}` : null,
    `salariat la ${companyName} ${companyCity}`,
  ].filter(Boolean).join(", ") + ",";

  // singular vs plural
  const core =
    days === 1
      ? `vă rog să-mi aprobați cererea de concediu de odihnă în data de ${dmyDot(startISO)}, respectiv 1 zi lucrătoare.`
      : `vă rog să-mi aprobați cererea de concediu de odihnă în perioada ${dmyDot(startISO)} – ${dmyDot(endInclusiveISO)}, respectiv ${days} zile lucrătoare.`;

  return { identity, core, endInclusiveISO };
}

/* ---------------- DOCX (nice formatting) ---------------- */
export async function generateLeaveDocx(opts: LeaveDocOpts) {
  const { employeeName, note } = opts;
  const { identity, core } = buildSentence(opts);

  const doc = new Document({
    creator: "Topaz Admin",
    description: "Cerere concediu odihnă",
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 24 }, // 12pt
          paragraph: { spacing: { after: 200 } },     // ~2pt after
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 2.54cm
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 },
            children: [new TextRun({ text: "Domnule Director,", bold: true })],
          }),

          // Identity + request (justified, first-line indent)
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
            indent: { firstLine: 720 }, // 0.5"
            children: [new TextRun(identity)],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
            indent: { firstLine: 720 },
            children: [new TextRun(core)],
          }),

          note
            ? new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 300 },
                indent: { firstLine: 720 },
                children: [new TextRun({ text: `Notă: ${note}` })],
              })
            : new Paragraph({}),

          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 300, after: 600 },
            children: [new TextRun({ text: "Vă mulțumesc." })],
          }),

          // Date + name/signature
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 },
            children: [new TextRun({ text: `Data: ${dayjs().format("DD.MM.YYYY")}` })],
          }),
          new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: "Nume, prenume:", bold: true })],
          }),
          new Paragraph({
            spacing: { after: 800 },
            children: [new TextRun({ text: employeeName.toUpperCase() })],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: "Semnătura:" })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Cerere concediu - ${employeeName} - ${dayjs(opts.startISO).format("YYYY-MM-DD")}.docx`;
  saveAs(blob, fileName);
}

/* ---------------- Print preview (same text) ---------------- */
export function openPrintPreview(opts: LeaveDocOpts) {
  const { employeeName, note } = opts;
  const { identity, core } = buildSentence(opts);

  const html = `
<!doctype html>
<html lang="ro">
<meta charset="utf-8">
<title>Cerere concediu – ${employeeName}</title>
<style>
  body{ font: 12pt "Times New Roman", serif; padding: 25mm; color:#111; }
  h1{ font-size:12pt; margin:0 0 12pt; font-weight:700; }
  p{ margin:0 0 8pt; text-align: justify; }
  .indent{ text-indent: 1.25cm; }
  .muted{ color:#444; }
  .sig{ height: 35mm; }
  @media print { button{ display:none } body{ padding: 15mm 20mm; } }
</style>
<body>
  <h1>Domnule Director,</h1>
  <p class="indent">${identity}</p>
  <p class="indent">${core}</p>
  ${note ? `<p class="indent muted">Notă: ${note}</p>` : ""}

  <p class="muted">Data: ${dayjs().format("DD.MM.YYYY")}</p>
  <p><strong>Nume, prenume:</strong></p>
  <p>${employeeName.toUpperCase()}</p>
  <div class="sig">Semnătura:</div>

  <button onclick="window.print()">Printează</button>
</body>
</html>`.trim();

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 300);
}
