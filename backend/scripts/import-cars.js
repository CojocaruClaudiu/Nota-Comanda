/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Paste your data exactly as you have it (tab-separated)
const DATA = `
UU10SDCJ556967281	Dacia	Dokker	2016	Albastru	PH 02 TOP	Gica (RCA fara decontare directa)	Motorina	17.07.2027	682	07.08.2026	338	01.08.2026	332
UU1K5220064211167	Dacia	Logan	2019	Albastru	PH 05 TOP	Manole/Nini	Motorina	21.10.2026	413	06.04.2026	215	30.10.2025	57
WAUZZZ8K8EA061134	Audi	A4	2013	Negru	PH 16 TOP	Nicoleta (RCA cu decontare directa)	Motorina	15.11.2025	73	07.08.2026	338	18.02.2026	168
WAUZZZF20LN026564	Audi	A6	2019	Negru	PH 40 TOP	Razvan	Hibrid (Motorina)	13.11.2026	436	21.10.2025	48	06.12.2025	94
UU14SDGG549095472	Dacia	Logan	2013	Albastru	PH 43 TOP	Ionut	Benzina / GPL	29.09.2025	26	07.12.2025	95	22.10.2025	49
UU17SDCH453687086	Dacia	Logan	2015	Alb	PH 45 TOP	Moraru Ion	Motorina	13.08.2027	709	07.12.2025	95	11.03.2026	189
ZCFC3573005660193	Iveco	35S10 Daily	2007	Alb	PH 46 TOP		Motorina	03.06.2026	273	07.12.2025	95	14.06.2026	284
UU1J9220668608004	Dacia	Lodgy	2021	Alb	PH 56 TOP	Luci/Bogdan	Motorina	11.02.2027	526	07.12.2025	95	10.03.2026	188
UU10SDA4552449002	Dacia	Dokker	2015	Albastru	PH 67 TOP	Romeo (RCA cu decontare directa)	Motorina	26.07.2027	691	07.08.2026	338	22.08.2026	353
UU1JSDDJ560416955	Dacia	Lodgy	2018	Albastru	PH 73 TOP	Constantin Dragomir	Motorina	10.08.2027	706	18.04.2026	227	26.04.2026	235
WAUZZZFY0J2051600	Audi	Q5	2018	Negru	PH 89 TOP	Simona (RCA cu decontare directa)	Motorina	23.10.2025	50	07.08.2026	338	11.01.2026	130
ZCFC535C005568067	Iveco	35S18	2020	Alb	PH 01 TPZ		Motorina	29.08.2026	360	27.07.2026	327	26.09.2025	23
YARVKEHZ7RZ107597	Toyota	Proace	2025	Gri	B 761 TOP		Motorina	13.05.2028	983	15.04.2026	224	05.06.2026	275
UU17SDA4449633011	Dacia	Logan	2013	Alb	PH 07 TPZ		Motorina	02.11.2025	60	07.12.2025	95	14.03.2026	192
WV2ZZZ7HZ7H073753	Volkswagen	Transporter	2007	Alb	PH 83 TOP		Motorina	14.02.2026	164			26.08.2026	357
`.trim();

function parseDMY(dmy) {
  if (!dmy) return null;
  const m = dmy.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, dd, MM, yyyy] = m;
  const iso = `${yyyy}-${MM}-${dd}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : iso; // keep ISO string; Prisma accepts Date or ISO
}

function fuelToEnum(s) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes('motorina')) return 'MOTORINA';
  if (t.includes('benzina') && t.includes('gpl')) return 'BENZINA_GPL';
  if (t.includes('hibrid') && t.includes('motorina')) return 'HIBRID_MOTORINA';
  if (t.includes('hibrid') && t.includes('benz')) return 'HIBRID_BENZINA';
  if (t.includes('electric')) return 'ELECTRIC';
  if (t.includes('benz')) return 'BENZINA';
  return 'ALT';
}

async function main() {
  const lines = DATA.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let ok = 0, fail = 0;
  for (const line of lines) {
    // split by TAB; your paste uses real tabs between columns
    const cols = line.split('\t');
    if (cols.length < 10) {
  console.warn('Linie ignorată (nu are suficiente coloane):', line);
      fail++;
      continue;
    }

    const [
      vin, marca, model, anStr, culoare, placuteRaw, sofer, combustibilRaw,
      expItpDMY, _zItp, expRcaDMY, _zRca, expRoviDMY, _zRovi,
    ] = cols;

    const placute = (placuteRaw || '').toUpperCase().replace(/\s+/g, ' ').trim();
    const combustibil = fuelToEnum(combustibilRaw);
    const expItp = parseDMY(expItpDMY);
    const expRca = parseDMY(expRcaDMY);
    const expRovi = parseDMY(expRoviDMY);
    const an = Number(anStr);

    if (!vin || !marca || !model || !placute || !an) {
  console.warn('Linie cu câmpuri lipsă, ignor:', line);
      fail++;
      continue;
    }

    try {
      const data = {
        vin: vin.trim(),
        marca: marca.trim(),
        model: model.trim(),
        an,
        culoare: (culoare || '').trim() || null,
        placute,
        driverId: null,                     // nu încercăm să mapăm la Employee automat
        driverNote: (sofer || '').trim() || null, // păstrăm textul aici
        combustibil,
        expItp: expItp ? new Date(expItp) : null,
        expRca: expRca ? new Date(expRca) : null,
        expRovi: expRovi ? new Date(expRovi) : null,
      };

      await prisma.car.upsert({
        where: { vin: data.vin },
        update: data,
        create: data,
      });

      ok++;
  console.log(`${placute} (${marca} ${model}) importat`);
    } catch (e) {
      fail++;
  console.error(`Eroare la VIN ${vin}:`, e?.message || e);
    }
  }

  console.log(`\nDone. Importate: ${ok}, erori: ${fail}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
