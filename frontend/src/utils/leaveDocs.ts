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
  requestDateISO?: string; // Date the request was made (defaults to today)

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
      ? `Vă rog să-mi aprobați cererea de concediu de odihnă în data de ${dmyDot(startISO)}, respectiv 1 zi lucrătoare.`
      : `Vă rog să-mi aprobați cererea de concediu de odihnă în perioada ${dmyDot(startISO)} – ${dmyDot(endInclusiveISO)}, respectiv ${days} zile lucrătoare.`;

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
            children: [new TextRun({ text: `Data: ${opts.requestDateISO ? dayjs(opts.requestDateISO).format("DD.MM.YYYY") : dayjs().format("DD.MM.YYYY")}` })],
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

/* ---------------- PDF generation (via browser print) ---------------- */
export function generateLeavePdf(opts: LeaveDocOpts) {
  // Use the browser's print-to-PDF feature for identical output to Word
  return openPrintPreview(opts);
}

/* ---------------- Print preview (same text) ---------------- */
export function openPrintPreview(opts: LeaveDocOpts) {
  const { employeeName, note } = opts;
  const { identity, core } = buildSentence(opts);

  const html = `
<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<title>Cerere concediu – ${employeeName}</title>
<style>
  body { 
    font: 12pt "Times New Roman", serif; 
    margin: 2.54cm;
    color: #000;
    line-height: 1.15;
  }
  p { 
    margin: 0 0 10pt 0;
    text-align: justify;
  }
  .indent { 
    text-indent: 1.27cm;
  }
  .header {
    font-weight: bold;
    margin-bottom: 10pt;
  }
  .thank-you {
    margin-top: 15pt;
    margin-bottom: 30pt;
    text-align: left;
  }
  .date {
    margin-bottom: 10pt;
  }
  .label {
    font-weight: bold;
    margin-top: 10pt;
    margin-bottom: 0;
  }
  .name {
    margin-bottom: 40pt;
  }
  .signature {
    margin-top: 0;
  }
  @media print { 
    body { margin: 2.54cm; }
  }
</style>
</head>
<body>
  <p class="header">Domnule Director,</p>
  <p class="indent">${identity}</p>
  <p class="indent">${core}</p>
  ${note ? `<p class="indent">Notă: ${note}</p>` : ""}
  <p class="thank-you">Vă mulțumesc.</p>
  <p class="date">Data: ${opts.requestDateISO ? dayjs(opts.requestDateISO).format("DD.MM.YYYY") : dayjs().format("DD.MM.YYYY")}</p>
  <p class="label">Nume, prenume:</p>
  <p class="name">${employeeName.toUpperCase()}</p>
  <p class="signature">Semnătura:</p>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    throw new Error("Pop-up blocat. Permite pop-up-urile pentru această pagină.");
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  
  // Automatically open print dialog (browser's PDF viewer)
  w.onload = () => w.print();
  
  return Promise.resolve();
}
