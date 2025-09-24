// Prisma-based importer for Operation Items
// - Parses the big plain-text list you provided
// - Groups by Operation (e.g., GLET, LAVABIL, etc.)
// - Upserts items under existing operations (createMany with skipDuplicates)
// Usage: npm run seed:operation-items

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Paste the full list exactly as provided (minor whitespace differences are ok)
const RAW_LIST = `
1. GLET	1.1. Aplicat plasa armare
1. GLET	1.2. Aplicat glet grosier
1. GLET	1.3. Aplicat glet finitie
1. GLET	1.4. Slefuit glet
1. GLET	1.5. Montat coltar aluminiu
1. GLET	1.6. Aplicat amorsa
1. GLET	1.7. Reparatii glet (mp/h)
1. GLET	1.8. Aplicare pasta imbinare
2. LAVABIL	2.1. Aplicat amorsa
2. LAVABIL	2.2. Aplicat lavabil/ 2 straturi
2. LAVABIL	2.3. Reparatii lavabil (mp/h)
2. LAVABIL	2.4. Aplicat vopsea lavabila (ml)
3. PERETI CU TENCUIELI USCATE	3.1. Montat structura metalica de 30 mm (mp/ml)/60 (mp)/ 75 mm (mp/ml)/ rectangulara de 40 (mp)/ 100 mp (mp)
3. PERETI CU TENCUIELI USCATE	3.2. Placare cu placi din gips carton ( strat dublu  )
3. PERETI CU TENCUIELI USCATE	3.3. Aplicat izolatie din vata (mp/h) si din polistiren (mp)
3. PERETI CU TENCUIELI USCATE	3.4. Aplicat hidroizolatie
3. PERETI CU TENCUIELI USCATE	3.5. Aplicat pal (mp)
3. PERETI CU TENCUIELI USCATE	3.6. Intarit structura metalica (mp)
3. PERETI CU TENCUIELI USCATE	3.7. Aplicat lemn (mp)
3. PERETI CU TENCUIELI USCATE	3.8. Siliconat lemn (mp)
3. PERETI CU TENCUIELI USCATE	3.9. Decupat gips carton (mp)
3. PERETI CU TENCUIELI USCATE	3.10. Aplicat spuma pereti (mp)
3. PERETI CU TENCUIELI USCATE	3.11. Aplicat placaj lemn (mp)
3. PERETI CU TENCUIELI USCATE	3.12. Demontat structura de 60 (mp)
3. PERETI CU TENCUIELI USCATE	3.13. Aplicat folie anticondens (mp)
3. PERETI CU TENCUIELI USCATE	3.14. Demontat strucutra de 75 (ml)
3. PERETI CU TENCUIELI USCATE	3.15. Aplicat placi Fireboard (mp)
4. TAVANE DIN TENCUIALA USCATA DIN GIPS CARTON	4.1. Montat structura metalica de 30 mm/ de 75 mm/ de 60 mm
4. TAVANE DIN TENCUIALA USCATA DIN GIPS CARTON	4.2. Placari cu placi din gips carton + strat dublu
4. TAVANE DIN TENCUIALA USCATA DIN GIPS CARTON	4.3. Aplicat izolatie din vata
4. TAVANE DIN TENCUIALA USCATA DIN GIPS CARTON	4.4. Ancorat tavan (mp)
5. MONTAT FAIANTA SAU GRESIE	5.1. Aplicat amorsa
5. MONTAT FAIANTA SAU GRESIE	5.2. Aplicat faianta/gresie
5. MONTAT FAIANTA SAU GRESIE	5.3. Chituit faianta/gresie
5. MONTAT FAIANTA SAU GRESIE	5.4. Montat plinta
5. MONTAT FAIANTA SAU GRESIE	5.5. Aplicat silicon (ml)
5. MONTAT FAIANTA SAU GRESIE	5.6. Vopsit /chituit plinta (ml)
5. MONTAT FAIANTA SAU GRESIE	5.7. Montat coltar exterior (ml)
5. MONTAT FAIANTA SAU GRESIE	5.8. Rostuit gresie (mp)
6. MONTAT MARMURA SAU GRANIT	6.1. Aplicat amorsa
6. MONTAT MARMURA SAU GRANIT	6.2. Montat marmura/granit (mp/buc/ml)
6. MONTAT MARMURA SAU GRANIT	6.3. Chituit marmura/granit(mp/ml)
6. MONTAT MARMURA SAU GRANIT	6.4. Montat plinta
6. MONTAT MARMURA SAU GRANIT	6.5. Slefuit marmura/granit (mp/ml)
6. MONTAT MARMURA SAU GRANIT	6.6. Decupaje marmura/granit
6. MONTAT MARMURA SAU GRANIT	6.7. Siliconat (ml)
6. MONTAT MARMURA SAU GRANIT	6.8. Montat pavele (mp)
6. MONTAT MARMURA SAU GRANIT	6.9. Lustruit marmura (mp)
6. MONTAT MARMURA SAU GRANIT	6.10. Aplicat srat subtire adeziv (mp)
6. MONTAT MARMURA SAU GRANIT	6.11. Bizotat granit (ml)
6. MONTAT MARMURA SAU GRANIT	6.12. Gaurit marmura (gauri)
6. MONTAT MARMURA SAU GRANIT	6.13. Aplicat coltar (ml)
6. MONTAT MARMURA SAU GRANIT	6.14. Debitat granit/marmura(h)
6. MONTAT MARMURA SAU GRANIT	6.15. Aplicat OSB (mp)
6. MONTAT MARMURA SAU GRANIT	6.16. Rostuit (mp)
6. MONTAT MARMURA SAU GRANIT	6.17. Decupat marmura (mp)
7. MONTAT PLACARI DIN HPL	7.1. Montat structura metalica (mp/ml)75/40
7. MONTAT PLACARI DIN HPL	7.2. Placare cu placi din HPL (mp/buc)
7. MONTAT PLACARI DIN HPL	7.3. Montat sina suport banda led
7. MONTAT PLACARI DIN HPL	7.4. Aplicat izolatie din vata
7. MONTAT PLACARI DIN HPL	7.5. Aplicat structura din lemn (mp/ml)(simplu/dublat structura/triplu strat)
7. MONTAT PLACARI DIN HPL	7.6. Aplicat suruburi structura (mp)
7. MONTAT PLACARI DIN HPL	7.7. Gaurit HPL (buc)
7. MONTAT PLACARI DIN HPL	7.8. Aplicat silicon (mp)
7. MONTAT PLACARI DIN HPL	7.9. Vopsit HPL (ml)
7. MONTAT PLACARI DIN HPL	7.10. Aplicat plinta HPL (ml)
7. MONTAT PLACARI DIN HPL	7.11. Decopertat HPL (mp)
7. MONTAT PLACARI DIN HPL	7.12. Aplicat lemn (mp)
7. MONTAT PLACARI DIN HPL	7.13.Debitat HPL (ml)
8. TURNAT SAPE DE NIVEL	8.1. Aplicat amorsa
8. TURNAT SAPE DE NIVEL	8.2. Turnat sapa nivel (mp/ml)
8. TURNAT SAPE DE NIVEL	8.3. Aplicat UA (ml/mp)
8. TURNAT SAPE DE NIVEL	8.4. Montat mocheta (mp)
8. TURNAT SAPE DE NIVEL	8.5. Aplicat structura metalica (mp)
8. TURNAT SAPE DE NIVEL	8.6.Aplicat polistiren (5 si 2 cm) (mp)
8. TURNAT SAPE DE NIVEL	8.7. Curatat terasament (mp)
8. TURNAT SAPE DE NIVEL	8.8. Aplicat dibluri polistiren (mp)
8. TURNAT SAPE DE NIVEL	8.9. Aplicat banda burete (ml)
8. TURNAT SAPE DE NIVEL	8.10. Aplicat plasa sudata (mp)
8. TURNAT SAPE DE NIVEL	8.11. Aplicat diblu incalzire pardoseala (mp)
9. TENCUIELI DIN MORTAR	9.1. Montat profile pt tencuit
9. TENCUIELI DIN MORTAR	9.2. Aplicat tencuiala grosiera
9. TENCUIELI DIN MORTAR	9.3. Aplicat tinci
9. TENCUIELI DIN MORTAR	9.4. Aplicat betoncontact (mp)
9. TENCUIELI DIN MORTAR	9.5. Aplicat adeziv perete (mp)
9. TENCUIELI DIN MORTAR	9.6. Aplicat plasa sudata (mp)
9. TENCUIELI DIN MORTAR	9.7. Aplicat fier beton+prelucrat fier (h)
9. TENCUIELI DIN MORTAR	9.8. Tras la dreptar (mp)
9. TENCUIELI DIN MORTAR	9.9. Aplicat profile tencuiala (ml)
9. TENCUIELI DIN MORTAR	9.10.Aplicat cofraj OSB (mp)
9. TENCUIELI DIN MORTAR	9.11. Aplicat amorsa (mp)
10. TERMOSISTEM	10.1. Montat profil soclu
10. TERMOSISTEM	10.2. Montat izolatie tip polistiren
10. TERMOSISTEM	10.3. Aplicat plasa armare
10. TERMOSISTEM	10.4. Aplicat amorsa
10. TERMOSISTEM	10.5. Aplicat tencuiala decorativa
10. TERMOSISTEM	10.6. Aplicat dibluri (mp)
10. TERMOSISTEM	10.7. Aplicat tinci si tras la dreptar (mp)
10. TERMOSISTEM	10.8. Aplicat coltar plasa (ml)
10. TERMOSISTEM	10.9. Aplicat spuma polistiren (mp)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.1. Termosistem suport
11. MONTAT PAVELE SAU PIATRA CUBICA	11.2. Montat piatra cubica
11. MONTAT PAVELE SAU PIATRA CUBICA	11.2. Montat/demontat pavele (mp)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.3. Chituit piatra cubica
11. MONTAT PAVELE SAU PIATRA CUBICA	11.4. Montat borduri (mp/ml/buc)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.5. Finisat muchii borduri la 45 (buc)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.6. Chituit borduri (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.7. Montat rigole (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.8. Aplicat cornier metalic terasament (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.9. Decopertat piatra cubica (mp)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.10. Chituit rigole (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.11. Curatat piatra cubica (mp)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.12. Compactat pavaj (mp)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.13. Aplicat nisip pavaj (mp)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.14. Aplicat platbanda metalica terasament (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.15. Montat piatra decorativa (mp)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.16.Aplicat silicon rigole (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.17. Debitat bordura (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.18. Montat plinta piatra (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.19. Debitat plinta granit (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.20. Aplicat piatra concasata (mp)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.21. Fixat platbanda+nivel (ml)
11. MONTAT PAVELE SAU PIATRA CUBICA	11.22. Intarit platbanda (ml)
12. MONTAT PARCHET	12.1. Aplicat amorsa
12. MONTAT PARCHET	12.2. Montat parchet
12. MONTAT PARCHET	12.3. Montat folie izolatoare
12. MONTAT PARCHET	12.4. Montat plinta
12. MONTAT PARCHET	12.5. Siliconat plinta
12. MONTAT PARCHET	12.6. Siliconat parchet (ml)
12. MONTAT PARCHET	12.7. Demontat parchet (mp)
12. MONTAT PARCHET	12.8. Aplicat strat Epoxy lipire parchet (mp)
12. MONTAT PARCHET	12.9. Montat treceri usi (ml)
12. MONTAT PARCHET	12.10. Decupat parchet (mp)
12. MONTAT PARCHET	12.11. Uleiat parchet (mp)
12. MONTAT PARCHET	12.12. Aplicat scoci (ml)
12. MONTAT PARCHET	12.13. Debitat parchet (ml)
12. MONTAT PARCHET	12.14.Curatat lac parchet (mp)
12. MONTAT PARCHET	12.15. Matuit parchet (mp)
13. PARDOSELI EPOXY	13.1. Sablare suport din beton
13. PARDOSELI EPOXY	13.2. Sigilare rosturi mp/ml
13. PARDOSELI EPOXY	13.3. Aplicat amorsa epoxy mp/ml (2 straturi -mp)
13. PARDOSELI EPOXY	13.4. Aplicat finisaj epoxy ml/mp
13. PARDOSELI EPOXY	13.5. Taiat rosturi dilatare
13. PARDOSELI EPOXY	13.6. Aplicat sigilant rosturi beton (mp/ml)
13. PARDOSELI EPOXY	13.7. Siliconat amorsa epoxy
13. PARDOSELI EPOXY	13.8. Curatare sigilant (ml/mp)
13. PARDOSELI EPOXY	13.9. Cofrat/Decofrat usi (buc)
14. REFACERE PARDOSELI EPOXY	14.1. Decopertare finisaj epoxy
14. REFACERE PARDOSELI EPOXY	14.2. Sablare suport beton
14. REFACERE PARDOSELI EPOXY	14.3. Aplicat amorsa epoxy
14. REFACERE PARDOSELI EPOXY	14.4. Aplicat finisaj epoxy
14. REFACERE PARDOSELI EPOXY	14.5. Taiat rosturi dilatare
14. REFACERE PARDOSELI EPOXY	14.6. Aplicat sigilant rosturi beton
14. REFACERE PARDOSELI EPOXY	14.7. Izolare temporara zone rectificate (mp)
14. REFACERE PARDOSELI EPOXY	14.8. Slefuit Epoxy (mp)
14. REFACERE PARDOSELI EPOXY	14.9. Taiat epoxy (ml)
14. REFACERE PARDOSELI EPOXY	14.10. Aplicat nisip (mp)
15. MANOPERE ELECTRICE	15.1. Tras cablu electric/date
15. MANOPERE ELECTRICE	15.2. Montat pat cablu
15. MANOPERE ELECTRICE	15.3. Montat doze aparat
15. MANOPERE ELECTRICE	15.4. Montat doze de legatura
15. MANOPERE ELECTRICE	15.5. Montat prize/intrerupatoare
15. MANOPERE ELECTRICE	15.6. Montat prize tip date
15. MANOPERE ELECTRICE	15.7. Montat corpuri iluminat
15. MANOPERE ELECTRICE	15.8. Montat banda led
15. MANOPERE ELECTRICE	15.9. Alimentari prize (buc)
15. MANOPERE ELECTRICE	15.10. Montat lampi marcaje (exit-uri)
15. MANOPERE ELECTRICE	15.11. Montat senzori detectie incendiu
15. MANOPERE ELECTRICE	15.12.Montat buton alarmare
15. MANOPERE ELECTRICE	15.13. Montat senzori fum
15. MANOPERE ELECTRICE	15.14. Montat fibra date
15. MANOPERE ELECTRICE	15.15. Montat camere video
15. MANOPERE ELECTRICE	15.16. Echipat tablou electric
15. MANOPERE ELECTRICE	15.17. Montat tablou electric
15. MANOPERE ELECTRICE	15.18. Automatizari usi/porti
15. MANOPERE ELECTRICE	15.19. Montat cofret/copex/teava
15. MANOPERE ELECTRICE	15.20. Legat senzori baterie lavoar/uscator/pisoar
15. MANOPERE ELECTRICE	15.21. Alimentare tablou electric
15. MANOPERE ELECTRICE	15.22. Alimentare aer conditionat
15. MANOPERE ELECTRICE	15.23. Montat pardoseli incalzite electric (sistem degivrare)
15. MANOPERE ELECTRICE	15.24. Instalatie electrica iluminare (lampi)
15. MANOPERE ELECTRICE	15.25. Pregatire montaj lampi iluminat/marcaj (exit) (buc)
15. MANOPERE ELECTRICE	15.26. Modificat lampi iluminat/lampi marcaje (buc)
15. MANOPERE ELECTRICE	15.27. Montat teava cablu (ml)
15. MANOPERE ELECTRICE	15.28. Montat lant (ml)
15. MANOPERE ELECTRICE	15.29. Montat rac
15. MANOPERE ELECTRICE	15.30. Tras firba optica
15. MANOPERE ELECTRICE	15.31. Legat doze in panou
15. MANOPERE ELECTRICE	15.32. Montat sursa
15. MANOPERE ELECTRICE	15.33. Decupaje pereti pentru doze/cablu
15. MANOPERE ELECTRICE	15.34. Lipit banda led (ml)
15. MANOPERE ELECTRICE	15.35. Alimentare lampi marcaje (buc)
15. MANOPERE ELECTRICE	15.36. Montat suport camere video (buc)
15. MANOPERE ELECTRICE	15.37. Alimentare camere video(buc)
15. MANOPERE ELECTRICE	15.38. Reparat camere video (buc)
15. MANOPERE ELECTRICE	15.39. Alimentare rac (buc)
15. MANOPERE ELECTRICE	15.40. Montat aer conditionat (buc)
15. MANOPERE ELECTRICE	15.41. Montat profile banda led (ml)
15. MANOPERE ELECTRICE	15.42. Legaturi cablaj banda led (ml)
15. MANOPERE ELECTRICE	15.43. Debitat profile banda led (ml)
15. MANOPERE ELECTRICE	15.44. Montat sigurante (buc)
15. MANOPERE ELECTRICE	15.45. Schimbat mufe TV ( buc)
15. MANOPERE ELECTRICE	15.46. Sunat cabluri pt banda led (ml)
15. MANOPERE ELECTRICE	15.47. Instalatie electrica centrala
15. MANOPERE ELECTRICE	15.48. Montat panouri fotovoltaice (buc)
15. MANOPERE ELECTRICE	15.49. Schimbat cablu otelos (ml)
15. MANOPERE ELECTRICE	15.50. Reparat sistem detectie (buc)
15. MANOPERE ELECTRICE	15.51. Schimbat acumulatori (buc)
15. MANOPERE ELECTRICE	15.52. Montat stecher (buc)
15. MANOPERE ELECTRICE	15.53. Gaurit stalpi (buc)
15. MANOPERE ELECTRICE	15.54. Montat comutator (buc)
15. MANOPERE ELECTRICE	15.55. Montat stalpi iluminat (buc)
15. MANOPERE ELECTRICE	15.56. Montat suporti stalpi iluminat (buc)
15. MANOPERE ELECTRICE	15.57. Montat senzor miscare (buc)
15. MANOPERE ELECTRICE	15.58. Conectat electrovalva gaze (buc)
15. MANOPERE ELECTRICE	15.59. Montat becuri (buc)
15. MANOPERE ELECTRICE	15.60. Alimentare corpuri iluminat (buc)
15. MANOPERE ELECTRICE	15.61. Montat termostat (buc)
15. MANOPERE ELECTRICE	15.62. Alimentare pompa recirculare (buc
15. MANOPERE ELECTRICE	15.63. Montat uscator (buc)
15. MANOPERE ELECTRICE	15.64. Montat suporti lampi (buc)
15. MANOPERE ELECTRICE	15.65. Montat presetupe (buc)
15. MANOPERE ELECTRICE	15.66. Montat masina de spalat (buc)
15. MANOPERE ELECTRICE	15.67. Montat dom (buc)
15. MANOPERE ELECTRICE	15.68. Alimentare dom (buc)
15. MANOPERE ELECTRICE	15.69. Aplicat silicon corpuri iluminat (ml)
16. DEMONTARI ELECTRICE	16.1. Demontat tablou electric
16. DEMONTARI ELECTRICE	16.2. Demontat camere video
16. DEMONTARI ELECTRICE	16.3. Demontat corpuri iluminat (buc)
16. DEMONTARI ELECTRICE	16.4. Demontat lampi marcaje (EXIT) (buc)
16. DEMONTARI ELECTRICE	16.5. Demontat prize (buc)
16. DEMONTARI ELECTRICE	16.6. Demontat TV (buc)
16. DEMONTARI ELECTRICE	16.7. Demontat DVR (buc)
16. DEMONTARI ELECTRICE	16.8. Demontat Hardware (buc)
17. CONFECTIONAT MOBILA	17.1. Debitat lemn (buc/mc/ml/mp)
17. CONFECTIONAT MOBILA	17.2. Calibrare lemn (buc/ml)
17. CONFECTIONAT MOBILA	17.3. Slefuire lemn (buc/ml)
17. CONFECTIONAT MOBILA	17.4. Ingaurire lemn (balamale) (buc)
17. CONFECTIONAT MOBILA	17.5. Grunduit lemn
17. CONFECTIONAT MOBILA	17.6. Lacuit/vopsit lemn (buc/ml)
17. CONFECTIONAT MOBILA	17.7. Periat lemn
17. CONFECTIONAT MOBILA	17.8. Montat mobila sau asamblat
17. CONFECTIONAT MOBILA	17.9. Demontat mobila si montat sau asamblat (buc)
17. CONFECTIONAT MOBILA	17.10. Chituit lemn
17. CONFECTIONAT MOBILA	17.11. Tivit lemn (scanduri) (mc)
17. CONFECTIONAT MOBILA	17.12. Montat balamale (buc)
17. CONFECTIONAT MOBILA	17.13. Debitat lemn in 45 (buc)
17. CONFECTIONAT MOBILA	17.14. Montat cornisa (buc)
17. CONFECTIONAT MOBILA	17.15. Aplicat lemn dulap (mp)
17. CONFECTIONAT MOBILA	17.16. Aplicat blat OSB+ debitat (mp)
17. CONFECTIONAT MOBILA	17.17. Aplicat pal dulap (mp)
18. CONFECTIE METALICA	18.1. Debitat material (mp/buc/ml)
18. CONFECTIE METALICA	18.2. Polizat material (mp/buc/ml)
18. CONFECTIE METALICA	18.3. Asamblat piese metalice (ml/mp/buc)
18. CONFECTIE METALICA	18.4. Chituit piese metalice (buc/mp/ml)
18. CONFECTIE METALICA	18.5. Slefuire sau pregatire piese metalice (buc/ml/mp)
18. CONFECTIE METALICA	18.6. Vopsit piese metalice (buc/ml/mp)
18. CONFECTIE METALICA	18.7. Montat piese metalice (buc/mp/ml)
18. CONFECTIE METALICA	18.8. Aplicat grund (buc/ml/mp)
18. CONFECTIE METALICA	18.9. Gaurit cornier (buc)
18. CONFECTIE METALICA	18.10. Aplicat cornier (ml)
18. CONFECTIE METALICA	18.11. Fixat structura metalica (mp)
18. CONFECTIE METALICA	18.12. Sudat piese metalice (buc/h/mp/ml)
18. CONFECTIE METALICA	18.13. Aplicat tabla
18. CONFECTIE METALICA	18.14. Infoliat structura metalica (buc)
18. CONFECTIE METALICA	18.15. Aplicat tija filetata (buc)
18. CONFECTIE METALICA	18.16. Montat balamale (buc)
18. CONFECTIE METALICA	18.17. Aplicat suruburi
18. CONFECTIE METALICA	18.19. Echipat boxe (buc)
18. CONFECTIE METALICA	18.20. Fixat dulap in suruburi (buc)
18. CONFECTIE METALICA	18.21. Montat picioare mobiler (buc)
18. CONFECTIE METALICA	18.22. Montat panouri metalice (buc)
18. CONFECTIE METALICA	18.23. Aplicat ancora chimica (buc)
18. CONFECTIE METALICA	18.24. Polizat prag metalic (buc)
18. CONFECTIE METALICA	18.25. Sudat cadre metalice si montat sina (buc)
19. MONTAT BANNER	19.1. Montat BANNER
19. MONTAT BANNER	19.2. Intins BANNER
19. MONTAT BANNER	19.3. Montat platbanda
20. TURNAT TREPTE	20.1. Cofrat
20. TURNAT TREPTE	20.2. Turnat trepte
20. TURNAT TREPTE	20.3. Decofrat
20. TURNAT TREPTE	20.4. Cofrat stalp (mp)
20. TURNAT TREPTE	20.5. Turnat stalp (mp)
20. TURNAT TREPTE	20.6. Decofrat stalp (mp)
20. TURNAT TREPTE	20.7. Aplicat plasa sudata (mp)
20. TURNAT TREPTE	20.8. Aplicat fier beton (mp)
21. MONTAT ACCESORII	21.1. Montat oglinzi
21. MONTAT ACCESORII	21.2. Montat mobila ( buc)
21. MONTAT ACCESORII	21.3. Montat bagheta (ml)
21. MONTAT ACCESORII	21.4. Chituit bagheta (ml)
21. MONTAT ACCESORII	21.5. Montat riflaj (mp)
21. MONTAT ACCESORII	21.6. Montat hota (buc)
21. MONTAT ACCESORII	21.7. Montat balustrada (ml)
21. MONTAT ACCESORII	21.8. Montat usi (buc)
21. MONTAT ACCESORII	21.9. Montat masa (cadru metalic) mp
21. MONTAT ACCESORII	21.10. Montat raft (buc)
21. MONTAT ACCESORII	21.11. Montat lustra (buc)
21. MONTAT ACCESORII	21.12. Montat mobilier bucatarie (h/PIESE)
21. MONTAT ACCESORII	21.13. Montat profil metalic usi (ml)
21. MONTAT ACCESORII	21.14. Montat gura ventilatie(buc)
21. MONTAT ACCESORII	21.15. Montat ilustratii (buc)
21. MONTAT ACCESORII	21.16. Montat inaltatoare scaune (buc)/ Montat scaune (buc)
21. MONTAT ACCESORII	21.17. Montat ornamente (buc/ml)
21. MONTAT ACCESORII	21.18. Montat manere frigidere (buc)
21. MONTAT ACCESORII	21.19. Montat mese (buc)
21. MONTAT ACCESORII	21.20. Montat plite (buc)
21. MONTAT ACCESORII	21.21. Montat limba metal broasca (buc)
21. MONTAT ACCESORII	21.22. Ancorat mobilier bucatarie (piese)
21. MONTAT ACCESORII	21.23. Montat manere usa (buc)
21. MONTAT ACCESORII	21.24. Montat butuc usa (buc)
21. MONTAT ACCESORII	21.25. Montat prag trecere (buc)
21. MONTAT ACCESORII	21.26. Montat pervaz usa (buc)
21. MONTAT ACCESORII	21.27. Montat plexiglas (mp)
21. MONTAT ACCESORII	21.28. Montat prag lift si vopsit (ml)
21. MONTAT ACCESORII	21.29. Demontat/montat motoare hote (buc)
21. MONTAT ACCESORII	21.30. Siliconat bagheta (ml)
21. MONTAT ACCESORII	21.31. Siliconat obiecte sanitare (ml)
21. MONTAT ACCESORII	21.32. Montat manere mobilier (buc)
21. MONTAT ACCESORII	21.33. Siliconat obiecte sanitare (buc)
22. DECOPERTARI	22.1. Decopertat pereti
22. DECOPERTARI	22.2. Decopertat beton pardoseala (MP/ML)
22. DECOPERTARI	22.3. Decopertat granit pardoseala (mp)
22. DECOPERTARI	22.4. Decopertat gipscarton (mp)
22. DECOPERTARI	22.5. Decopertat piatra cubica (mp/ml)
22. DECOPERTARI	22.6. Sapat sant (ml)
22. DECOPERTARI	22.7. Decopertat plasa si glet (mp)
22. DECOPERTARI	22.8. Demolat acoperis (mp)
22. DECOPERTARI	22.9. Demolat pereti (rigips, UA 75) (mp)
22. DECOPERTARI	22.10. Demolari zid beton (h)
22. DECOPERTARI	22.10. Demolari zid beton (mp)
22. DECOPERTARI	22.11. Demolat grinda beton (ml)
22. DECOPERTARI	22.12. Demolat structura metalica 60 (mp)
22. DECOPERTARI	22.13. Demolat beton pardoseala (h)
22. DECOPERTARI	22.14. Gaurit perete beton (buc)
22. DECOPERTARI	22.15. Decopertat faianta (mp)
22. DECOPERTARI	22.16. Decopertat gresie (mp)
22. DECOPERTARI	22.17 Decopertat tavane
23. LUCRARI SPECIALE	23.1. Vopsit cifre rampe
23. LUCRARI SPECIALE	23.2. Matuit tevi PVC si lipt capac
23. LUCRARI SPECIALE	23.3. Vopsit sigle
23. LUCRARI SPECIALE	23.4. Decupat panou
23. LUCRARI SPECIALE	23.5. Montat grila ventilatie
23. LUCRARI SPECIALE	23.6. Reparat glaf (mp)
23. LUCRARI SPECIALE	23.7. Vopsit riflaj (mp)
23. LUCRARI SPECIALE	23.8. Taiat surplus metalic (buc)
23. LUCRARI SPECIALE	23.9. Montat panou sandwich (mp)
23. LUCRARI SPECIALE	23.10. Demontat utilaje (h/buc)
23. LUCRARI SPECIALE	23.11. Vopsit scara (mp)
23. LUCRARI SPECIALE	23.12. Nivel platforma (h)
23. LUCRARI SPECIALE	23.13. Aplicat silicon glafuri/usi/plinta (ml)
23. LUCRARI SPECIALE	23.14. Vopsit rampe (ml)
23. LUCRARI SPECIALE	23.15. Demontat panouri gard (buc)
23. LUCRARI SPECIALE	23.16. Montat gard (panouri) (buc)
23. LUCRARI SPECIALE	23.17. Sudat porti (buc)
23. LUCRARI SPECIALE	23.18. Montat grilaj metalic (buc)
23. LUCRARI SPECIALE	23.19. Montat plasa grilaj metalic (mp)
23. LUCRARI SPECIALE	23.20. Montat plinta pvc/siliconat (ml)
23. LUCRARI SPECIALE	23.21. Croit jgheab (ml)
23. LUCRARI SPECIALE	23.22. Montat instaltie apometru apa (buc)
23. LUCRARI SPECIALE	23.23. Vopsit cablu (ml)
23. LUCRARI SPECIALE	23.24. Modificat prinderi cablaj (buc)
23. LUCRARI SPECIALE	23.25. Montat plasa tantari (buc)
23. LUCRARI SPECIALE	23.26. Montat trape vizitare (buc)
23. LUCRARI SPECIALE	23.27. Vopsit ferme metalice (ml)
23. LUCRARI SPECIALE	23.28. Montat tabla panou sandwich (mp)
23. LUCRARI SPECIALE	23.29. Montat polite dulap (buc)
23. LUCRARI SPECIALE	23.30. Montat sigle (buc)
23. LUCRARI SPECIALE	23.31. Montat colare PVC (buc)
23. LUCRARI SPECIALE	23.32. Vopsit stalpi metalici (buc)
23. LUCRARI SPECIALE	23.33. Montat coltar aluminiu (ml)
23. LUCRARI SPECIALE	23.34. Montat platbanda metalica (ml)
23. LUCRARI SPECIALE	23.35. Montat podea cauciucata (mp/h)
23. LUCRARI SPECIALE	23.36. Montat structura metalica lift (mp)
23. LUCRARI SPECIALE	23.37. Montat lavoir (baruri)(buc)
23. LUCRARI SPECIALE	23.38. Infloiat corpuri iluminat (buc)
23. LUCRARI SPECIALE	23.39. Montat cot PVC (buc)
23. LUCRARI SPECIALE	23.40. Montat frigidere (buc)
23. LUCRARI SPECIALE	23.41.Montat colier prindere teava (buc)
23. LUCRARI SPECIALE	23.42. Aplicat chit reparatie beton (mp)
23. LUCRARI SPECIALE	23.43. Chituit forex (ml)
23. LUCRARI SPECIALE	23.44. Montat Eucaplit (mp)
23. LUCRARI SPECIALE	23.45. Montat bara alama (ml)
23. LUCRARI SPECIALE	23.46. Izolat cu folie (mp)
23. LUCRARI SPECIALE	23.47. Montat grilaje scurgere apa (buc)
23. LUCRARI SPECIALE	23.48. Montat marcaj atentionare (buc)
23. LUCRARI SPECIALE	23.49. Montat banda antiderapanta (buc)
23. LUCRARI SPECIALE	23.50. Asambalt paturi (buc)
23. LUCRARI SPECIALE	23.51. Montat mese (buc)
23. LUCRARI SPECIALE	23.52. Modificat intrand usi (buc)
23. LUCRARI SPECIALE	23.53. Demolat structura metalica (mp)
23. LUCRARI SPECIALE	23.54. Montat broasca (buc)
23. LUCRARI SPECIALE	23.55. Turnat sapa suport umbrele (buc)
23. LUCRARI SPECIALE	23.56. Aplicat tabla horn (mp)
23. LUCRARI SPECIALE	23.57. Montat glaf (buc)
23. LUCRARI SPECIALE	23.58. Aplicat tabla stalpi metalici (mp)
23. LUCRARI SPECIALE	23.59. Aplicat coltar tabla (ml)
23. LUCRARI SPECIALE	23.60. Reparat chedere porti (boxe)
23. LUCRARI SPECIALE	23.61. Montat iale grajd (buc)
23. LUCRARI SPECIALE	23.62. Aplicat coltar PVC (buc)
23. LUCRARI SPECIALE	23.63.Aplicat spuma atic (ml)
23. LUCRARI SPECIALE	23.64. Montat burlan (ml)
23. LUCRARI SPECIALE	23.65. Demontat usa (mp)
23. LUCRARI SPECIALE	23.66. Aplicat coama tabla acoperis (ml)
23. LUCRARI SPECIALE	23.67. Montat usa + cadru/amortizor (buc)
23. LUCRARI SPECIALE	23.68. Montat chiuveta (buc)
23. LUCRARI SPECIALE	23.69. Demontat/montat geam (buc)
23. LUCRARI SPECIALE	23.70. Montat cauciuc
23. LUCRARI SPECIALE	23.71. Reparat caramida (buc)
23. LUCRARI SPECIALE	23.72. Montat suporti (buc)
23. LUCRARI SPECIALE	23.73. Montat senzor gaz(buc)
23. LUCRARI SPECIALE	23.74. Montat picioare mese (mese)
23. LUCRARI SPECIALE	23.75. Demontat/montat geamuri (buc)
23. LUCRARI SPECIALE	23.76. Montat capac Ac (buc)
23. LUCRARI SPECIALE	23.77. Sablon mana curenta (ml)
23. LUCRARI SPECIALE	23.78. Taiat banda burete (ml)
23. LUCRARI SPECIALE	23.79. Montat structura lemn eucalipt (mp)
23. LUCRARI SPECIALE	23.80. Aplicat moloz (mp)
23. LUCRARI SPECIALE	23.81. Montat Geberit (buc)
23. LUCRARI SPECIALE	23.82. Montat utilaje (h)
23. LUCRARI SPECIALE	23.83. Aplicat vopsea marcaje (h)
23. LUCRARI SPECIALE	23.84. Montat tabla inox (mp)
23. LUCRARI SPECIALE	23.85. Aplicat silicon rosturi panou sandwich (ml)
23. LUCRARI SPECIALE	23.86. Izolat iluminator (buc)
23. LUCRARI SPECIALE	23.87. Montat profil tabla (ml)
23. LUCRARI SPECIALE	23.88. Montat ventilatoare (buc)
23. LUCRARI SPECIALE	23.89. Montat boxe (buc)
23. LUCRARI SPECIALE	23.90. Izolat pardoseala (folie+carton) (mp)
23. LUCRARI SPECIALE	23.91. Spart teava perete (ml)
23. LUCRARI SPECIALE	23.92. Vopsit plinta (ml)
23. LUCRARI SPECIALE	23.93. Debitat panou (ml)
23. LUCRARI SPECIALE	23.94. Montat picurator tabla (ml)
23. LUCRARI SPECIALE	23.95. Montat carcasa utilaj pufuleti (buc)
23. LUCRARI SPECIALE	23.96. Izolat geamuri cu folie (mp)
23. LUCRARI SPECIALE	23.97. Lipit capace metalice boxe (ornamenre stalpi) (buc)
23. LUCRARI SPECIALE	23.98. Aplicat spuma pardoseli (ml)
23. LUCRARI SPECIALE	23.99. Chituit plinta PVC (ml)
23. LUCRARI SPECIALE	23.100. Montat cheder usa (ml)
23. LUCRARI SPECIALE	23.101. Montat motor lift (buc)
23. LUCRARI SPECIALE	23.102. Demontat manere usi (buc)
23. LUCRARI SPECIALE	23.103. Modificat usi (buc)
23. LUCRARI SPECIALE	23.104. Spart beton (mp)
23. LUCRARI SPECIALE	23.105. Montat suport dedurizator apa (buc)
23. LUCRARI SPECIALE	23.106. Montat cadru metal usa (mp)
23. LUCRARI SPECIALE	23.107. Montat masina cafea (buc)
23. LUCRARI SPECIALE	23.108. Debitat membrana (ml)
23. LUCRARI SPECIALE	23.109. Aplicat silicon membrana (ml)
23. LUCRARI SPECIALE	23.110. Slefuit muchii eucalipt (ml)
23. LUCRARI SPECIALE	23.111. Vopsit lampi exit (buc)
23. LUCRARI SPECIALE	23.112. Montat mana curenta balustrada (ml)
23. LUCRARI SPECIALE	23.113. Vopsit teava gaze (ml)
23. LUCRARI SPECIALE	23.114. Montat suporti sticle vin (buc)
23. LUCRARI SPECIALE	23.115. Montat dulap (buc)
23. LUCRARI SPECIALE	23.116. Lipit membrana cauciuc (ml)
23. LUCRARI SPECIALE	23.117. Montat TV (buc)
23. LUCRARI SPECIALE	23.118. Aplicat tub scurgere apa (buc)
23. LUCRARI SPECIALE	23.119. Montat opritoare (buc)
23. LUCRARI SPECIALE	23.120. Izolat boxe cu folie (buc)
23. LUCRARI SPECIALE	23.121. Aplicat membrana (mp/ml)
23. LUCRARI SPECIALE	23.122. Demontat porti (buc)
23. LUCRARI SPECIALE	23.123. Reglat porti (buc)
23. LUCRARI SPECIALE	23.124. Aplicat capac canal (buc)
23. LUCRARI SPECIALE	23.125. Montat camin PVC (buc)
23. LUCRARI SPECIALE	23.126. Montat suport metalic (buc)
23. LUCRARI SPECIALE	23.127. Siliconat aerisitoare (buc)
23. LUCRARI SPECIALE	23.128. Aplicat banda OBO (buc)
23. LUCRARI SPECIALE	23.129. Aplicat silicon platbanda (ml)
23. LUCRARI SPECIALE	23.130. Asambalt cusca masina pufuleti (buc)
23. LUCRARI SPECIALE	23.131. Lipit tapet (mp)
23. LUCRARI SPECIALE	23.132. Montat tubulatura aer (ml)
23. LUCRARI SPECIALE	23.133. Reglaje usi (buc)
23. LUCRARI SPECIALE	23.134. Montat sistem deschidere usi urgenta (buc)
23. LUCRARI SPECIALE	23.135. Demontat si montat dusumea (mp)
23. LUCRARI SPECIALE	23.136. Aplicat linoleu (mp)
23. LUCRARI SPECIALE	23.137. Demontat amortizor usa (buc)
23. LUCRARI SPECIALE	23.138. Montat capac tabla (mp)
23. LUCRARI SPECIALE	23.139. Montat jgheab (ml)
23. LUCRARI SPECIALE	23.140. Montat porti (buc)
23. LUCRARI SPECIALE	23.141. Montat panou lemn (buc)
23. LUCRARI SPECIALE	23.142. Reparat iluminator (buc)
23. LUCRARI SPECIALE	23.143. Montat picior metalic (ml)
23. LUCRARI SPECIALE	23.144. Montat panel (mp)
23. LUCRARI SPECIALE	23.145. Asamblat tubulatura (ml)
23. LUCRARI SPECIALE	23.146. Montat coltar cauciuc (ml)
23. LUCRARI SPECIALE	23.147. Compactat moloz (mp)
23. LUCRARI SPECIALE	23.148. Siliconat suruburi (buc)
23. LUCRARI SPECIALE	23.149. Strans suruburi (buc)
23. LUCRARI SPECIALE	23.150. Montat coltar spuma (buc)
23. LUCRARI SPECIALE	23.151. Montat cos fum (ml)
23. LUCRARI SPECIALE	23.152. Montat teava apa (ml)
23. LUCRARI SPECIALE	23.153. Demontat mese (buc)
23. LUCRARI SPECIALE	23.154. Aplicat silicon grinzi lemn (ml)
23. LUCRARI SPECIALE	23.155. Montat profil colt scara (ml)
23. LUCRARI SPECIALE	23.156. Montat profil colt trepte (ml)
23. LUCRARI SPECIALE	23.157. Aplicat silicon tamplarie si trepte (ml)
23. LUCRARI SPECIALE	23.158. Demontat/montat calorifere (buc)
23. LUCRARI SPECIALE	23.159. Izolat teava trape+trape+fisuri (buc)
23. LUCRARI SPECIALE	23.160. Fixat mese metalice
23. LUCRARI SPECIALE	23.161. Aplicat funie (ml)
23. LUCRARI SPECIALE	23.162. Montat ghivece (buc)
23. LUCRARI SPECIALE	23.163. Demontat/montat umbrele (buc)
23. LUCRARI SPECIALE	23.164. Siliconat cornier (ml)
23. LUCRARI SPECIALE	23.165.Plantat gazon (mp)
23. LUCRARI SPECIALE	23.166. Montat folie protectie (mp)
23. LUCRARI SPECIALE	23.167. Montat capac AC (buc)
23. LUCRARI SPECIALE	23.168. Demontat/taiat platbanda+ fier beton (ml)
23. LUCRARI SPECIALE	23.169. Montat draperii (buc)
23. LUCRARI SPECIALE	23.170. Montat sina aluminiu (ml)
23. LUCRARI SPECIALE	23.171. Montat paturi (buc)
23. LUCRARI SPECIALE	23.172. Vopsit marcaje (mp)
23. LUCRARI SPECIALE	23.173. Montat stalpi (buc)
23. LUCRARI SPECIALE	23.174. Montat poarta (buc)
23. LUCRARI SPECIALE	23.175. Reapartie umbrela (buc)
23. LUCRARI SPECIALE	23.176. Montat tubulatura aspiratie (ml)
23. LUCRARI SPECIALE	23.177. Confectionat cutie distributie aspiratie
24. VOPSIT PERETI CU VOPSEA/EPOXY	24.1. Aplicat amorsa
24. VOPSIT PERETI CU VOPSEA/EPOXY	24.2. Aplicat vopsea epoxy/vopsea
24. VOPSIT PERETI CU VOPSEA/EPOXY	24.3. Slefuit beton (mp)
24. VOPSIT PERETI CU VOPSEA/EPOXY	24.4. Reparatii (mp)
25. TAVANE DIN LEMN	25.1. Aplicat structura din lemn (mp)
25. TAVANE DIN LEMN	25.1. Aplicat structura din lemn (2 straturi)(mp)
25. TAVANE DIN LEMN	25.2. Aplicat structura metalica (mp)
25. TAVANE DIN LEMN	25.3. Modificat structura lemn tavan (mp)
25. TAVANE DIN LEMN	25.4. Aplicat izolatie Staico/din vata (mp)
25. TAVANE DIN LEMN	25.5. Aplicat folie (mp)
25. TAVANE DIN LEMN	25.6. Aplicat OSB (mp)
26. MONTAT PIATRA	26.1. Aplicat amorsa (mp)
26. MONTAT PIATRA	26.2. Aplicat piatra (mp/ml)
27. PERETI DIN BCA	27.1. Zidarie din BCA (mp)
27. PERETI DIN BCA	27.2. Aplicat plasa armare (mp)
27. PERETI DIN BCA	27.3. Tras la dreptar (mp)
27. PERETI DIN BCA	27.4. Driscuit (mp)
27. PERETI DIN BCA	27.5. Aplicat Procontact (mp)
27. PERETI DIN BCA	27.6. Aplicat polistiren 2 (mp)
27. PERETI DIN BCA	27.7. Aplicat tinci (mp)
27. PERETI DIN BCA	27.8. Aplicat coltare (ml)
28. CAMINE IRIGATIE	28.1. Sapat (mp)
28. CAMINE IRIGATIE	28.2. Cofrat (mp)
28. CAMINE IRIGATIE	28.3. Aplicat plasa pt beton (mp)
28. CAMINE IRIGATIE	28.4. Turnat beton (mp/ml)
28. CAMINE IRIGATIE	28.5. Decofrat (mp)
28. CAMINE IRIGATIE	28.6. Montat camine apa (buc)
28. CAMINE IRIGATIE	28.7. Aplicat pal 2 (mp)
28. CAMINE IRIGATIE	28.8. montat cadru metalic (mp)
28. CAMINE IRIGATIE	28.9. Curatat capace camine beton (buc)
28. CAMINE IRIGATIE	28.10. Demontat/ridicat capac (buc)
28. CAMINE IRIGATIE	28.11. Rectificat beton cofraj (buc)
29. IZOLATII TERMICE	29.1. Aplicat vata (ore)
29. IZOLATII TERMICE	29.2. Aplicat armaflex (ore)
30. PERETI DIN LEMN SI OSB	30.1. Aplicat strucutra din lemn (mp)
30. PERETI DIN LEMN SI OSB	30.2. Aplicat izolatie (mp)
30. PERETI DIN LEMN SI OSB	30.3.Aplicat OSB
30. PERETI DIN LEMN SI OSB	30.4. Aplicat lemn in grinzi
31. MONTAT/DEMONTAT RAFT	31.1. Montat/demontat picioare (buc)
31. MONTAT/DEMONTAT RAFT	31.2. Montat/demontat traverse (buc)
31. MONTAT/DEMONTAT RAFT	31.3. Aplicat conexpand (picioare)
31. MONTAT/DEMONTAT RAFT	31.4. Asamblat picioare (buc)
31. MONTAT/DEMONTAT RAFT	31.5. Montat/demontat traverse centrale (buc)
31. MONTAT/DEMONTAT RAFT	31.6. Montat/demontat traverse mici (buc)
31. MONTAT/DEMONTAT RAFT	31.7. Debitat traverse si picioare (piese)
31. MONTAT/DEMONTAT RAFT	31.8. Modificat pozitie traverse (buc)
31. MONTAT/DEMONTAT RAFT	31.9. Montat picioare tip L+ sudat (buc)
32. MENTENANTA	32.1. Montat/schimbat gresie (h)
33. COFRAJE DIN BETON	33.1. Aplicat cofraj (mp/ml)
33. COFRAJE DIN BETON	33.2. Aplicat plasa sudata (4mm) (mp)
33. COFRAJE DIN BETON	33.3. Turnat beton (mp/ml)
33. COFRAJE DIN BETON	33.4. Decofrat (mp/ml)
33. COFRAJE DIN BETON	33.5. Turnat amorsa Epoxy + nisip (ml/mp)
33. COFRAJE DIN BETON	33.6. Aplicat fier (ml/mp)
33. COFRAJE DIN BETON	33.7. Aplicat cofraj metal (mp)
33. COFRAJE DIN BETON	33.8. Prelucrat fier (ml)
33. COFRAJE DIN BETON	33.9. Aplicat martori (fier beton) (mp)
33. COFRAJE DIN BETON	33.10. Terasament + sapaturi
33. COFRAJE DIN BETON	33.11. Taiat rosturi beton (mp)
34. RECTIFICARI PARDOSELI DIN GRESIE	34.1. Aplicat chit reparatie (mp)
34. RECTIFICARI PARDOSELI DIN GRESIE	34.2. Slefuit (mp)
35. VOPSIT GARD	35.1. Curatat gard (mp)
35. VOPSIT GARD	35.2. Montat amorsa gard (mp)
35. VOPSIT GARD	35.3. Aplicat vopsea gard (mp)
35. VOPSIT GARD	
36. RECONDITIONARE LEMN	36.1. Demontat lemn (ml)
36. RECONDITIONARE LEMN	36.2. Curatare si prelucrare lemn (ml)
36. RECONDITIONARE LEMN	36.3. Montat lemn (ml)
36. RECONDITIONARE LEMN	36.4. Polizat platbanda (ml)
37. HIDROIZOLATIE	37.1. Aplicat hidroizolatie pardoseala (mp)
38. PARAPETI DIN BETON	38.1. Aplicat kit reparatie (mp)
38. PARAPETI DIN BETON	38.2. Slefuit kit reparatie (mp)
38. PARAPETI DIN BETON	38.3. Aplicat amorsa (mp)
38. PARAPETI DIN BETON	38.4. Aplicat vopsea decorativa (mp)
38. PARAPETI DIN BETON	38.5. Aplicat plasa armare (mp)
38. PARAPETI DIN BETON	38.6. Tras la dreptar (mp)
38. PARAPETI DIN BETON	38.7. Driscuit (mp)
39.PLACARI DIN AQAPANEL	39.1 Montat structura metalica
39.PLACARI DIN AQAPANEL	39.2 Placare cu placi Aqapanel / fibrociment (mp)
39.PLACARI DIN AQAPANEL	39.3 Aplicat plasa armare (mp)
39.PLACARI DIN AQAPANEL	39.4 Aplicat PROCONTACT
39.PLACARI DIN AQAPANEL	39.5 Aplicat coltare (ml)
39.PLACARI DIN AQAPANEL	39.6 Aplicat picurator (ml)
39.PLACARI DIN AQAPANEL	39.7. Driscuit (mp)
39.PLACARI DIN AQAPANEL	39.8. Aplicat amorsa (mp)
39.PLACARI DIN AQAPANEL	39.9. Aplicat vopsea decorativa (mp)
39.PLACARI DIN AQAPANEL	39.10. Aplicat hidroizolatie (mp)
40. PANOU SANDWICH	40.1 Demontat ferestre/usi (buc)
40. PANOU SANDWICH	40.2 Decupat panou(mp)
40. PANOU SANDWICH	40.3 Aplicat panou sandwich(mp)
41. FATADE DIN BETON	41.1. Montaj schela+ ancorare
41. FATADE DIN BETON	41.2. Termosistem ( vata/polistiren ) (mp)
41. FATADE DIN BETON	41.3. Gaurit,decupat,Aplicat diblu(mp)
41. FATADE DIN BETON	41.4. Aplicat plasa armare(mp)
41. FATADE DIN BETON	41.5. Aplicat adeziv(mp)
41. FATADE DIN BETON	41.6. Tras la dreptar(mp)
41. FATADE DIN BETON	41.7. Driscuit(mp)
41. FATADE DIN BETON	41.8. Aplicat amorsa(mp)
41. FATADE DIN BETON	41.9. Aplicat vopsea ( decorativa,lavabila )(mp)
41. FATADE DIN BETON	41.10. Aplicat polistiren glafuri(mp)
41. FATADE DIN BETON	41.11. Aplicat coltare cu plasa (ml)
41. FATADE DIN BETON	41.12. Aplicat coltare usi - ferestre (ml)
41. FATADE DIN BETON	41.13. Aplicat picurator (ml)
41. FATADE DIN BETON	41.14. Aplicat polistiren goluri pereti(mp)
41. FATADE DIN BETON	41.15. Aplicat polistiren atic (mp)
41. FATADE DIN BETON	41.16 Nuturi
41. FATADE DIN BETON	41.17. Aplicat hidroizolatie (mp)
41. FATADE DIN BETON	41.18. Aplicat banda bitumioasa (mp)
41. FATADE DIN BETON	41.19. Aplicat betopan (mp)
41. FATADE DIN BETON	41.20. Aplicat OSB (mp)
41. FATADE DIN BETON	41.21. Aplicat bait tamplarie lemn (buc)
41. FATADE DIN BETON	41.22. Reparatii (mp)
42. IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)	42.1. Decopertat membrana (mp)
42. IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)	42.2. Aplicat folie (mp)
42. IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)	42.3. Aplicat vata bazaltica (mp)
42. IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)	42.4. Aplicat dibluri vata (mp)
42. IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)	42.5. Aplicat membrana (mp)
42. IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)	42.6. Montat sort tabla (ml)
42. IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)	42.7. Demontat sort tabla (ml)
42. IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)	42.8. Siliconat sort tabla (ml)
43. TURNAT FUNDATII DIN BETON	43.1. Cofrat (mp)
43. TURNAT FUNDATII DIN BETON	43.2. Aplicat fier (mp)
43. TURNAT FUNDATII DIN BETON	43.3. Turnat (mp)
43. TURNAT FUNDATII DIN BETON	43.4. Decofrat (mp)
43. TURNAT FUNDATII DIN BETON	43.6. Aplicat agrafe (mp)
43. TURNAT FUNDATII DIN BETON	43.7. Popit (mp)
43. TURNAT FUNDATII DIN BETON	43.8. Prelucrat fier
43. TURNAT FUNDATII DIN BETON	43.9. Aplicat plasa armare (mp)
43. TURNAT FUNDATII DIN BETON	43.10. Aplicat polistiren (5) (mp)
44. ACOPERIS DIN LEMN	44.1. Acoperis caroiaj lemn
44. ACOPERIS DIN LEMN	44.2. Aplicat structura lemn
44. ACOPERIS DIN LEMN	44.3. Aplicat ancora metal (buc)
44. ACOPERIS DIN LEMN	44.4. Decofrat (ml)
44. ACOPERIS DIN LEMN	44.5. Aplicat OSB (18) (mp)
44. ACOPERIS DIN LEMN	44.6. Aplicat izolatie vata (mp)
45. ZIDARIE DIN CARAMIDA	45.1. Aplicat amorsa (mp)
45. ZIDARIE DIN CARAMIDA	45.2. Aplicat caramida (mp)
46. TAMPLARIE PVC	46.1. Montat tamplarie PVC+ debitat (mp)
46. TAMPLARIE PVC	46.2. Montat panel (mp)
46. TAMPLARIE PVC	46.3. Montat platbanda aluminiu (ml)
46. TAMPLARIE PVC (mp)	46.4. Demolat tamplarie PVC
46. TAMPLARIE PVC	46.4. Demolat  tamplarie PVC (mp)
47. TEREN ANTRENAMENT	47.1. Aplicat motosapa (sapat teren)
47. TEREN ANTRENAMENT	47.2. Aplicat textil (mp)
47. TEREN ANTRENAMENT	47.3. Tras la dreptar (mp)
47. TEREN ANTRENAMENT	47.4. Compactat (mp)
47. TEREN ANTRENAMENT	47.5. Debitat textil (balot)
47. TEREN ANTRENAMENT	47.6. Aplicat nisip + tras la dreptar (mp)
47. TEREN ANTRENAMENT	47.7. Aplicat pamant terasament (mp)
47. TEREN ANTRENAMENT	47.8. Aplicat cauciuc terasament (mp)
47. TEREN ANTRENAMENT	47.9. Intors cauciuc (mp)
47. TEREN ANTRENAMENT	47.10. Montat cauciuc (mp)
47. TEREN ANTRENAMENT	47.11. Spalat cauciuc (mp)
47. TEREN ANTRENAMENT	47.12. Amestec nisip+ textil (h)
48.BOXE	48.1. Slefuit piese metalice (buc)
48.BOXE	48.2. Vopsit piese metalice (buc)
48.BOXE	48.3. Asamblat boxe (buc)
48.BOXE	48.4. Montat prelata (boxe)
49. LUCRARI SANITARE	49.1.Montat teava (ml)
49. LUCRARI SANITARE	49.2. Fixat teava (ml)
49. LUCRARI SANITARE	49.3. Montat teava PVC (ml)
49. LUCRARI SANITARE	49.4. Montat coturi (buc)
49. LUCRARI SANITARE	49.5. Montat ramificatii (buc)
49. LUCRARI SANITARE	49.6. Montat mufe (buc)
49. LUCRARI SANITARE	49.7. Montat lavoar (buc)
49. LUCRARI SANITARE	49.8. Montat WC (buc)
49. LUCRARI SANITARE	49.9. Montat baterie dus (buc)
49. LUCRARI SANITARE	49.10. Montat baterie chiuveta (buc)
50. ASAMBLARI STRUCTURI METALICE	50.1. Montat structura metalica scena (h)
50. ASAMBLARI STRUCTURI METALICE	50.2. Asamblat structura metalica scena (h)
23. LUCRARI SPECIALE	23.178. CURATENIE
22. DECOPERTARI	22.18 .Demontat panou Sandwich
6. MONTAT MARMURA SAU GRANIT	6.18. Curatat, spalat granit (mp)
44. ACOPERIS DIN LEMN	44.7. Aplicat suruburi (mp)
21. MONTAT ACCESORII	21.34. Siliconat hota (ml)
23. LUCRARI SPECIALE	23.179. Montat masina vidat (buc)
23. LUCRARI SPECIALE	23.180. Montat amplificator wireless (buc)
23. LUCRARI SPECIALE	23.181  Demolat panou sandwich (mp)
23. LUCRARI SPECIALE	23.182. Demolat cadru usa (buc)
23. LUCRARI SPECIALE	23.183. Montat tabla motor (buc)
23. LUCRARI SPECIALE	23.184. Demolat / montat panou boxa
23. LUCRARI SPECIALE	23.185. Demolat / montat prelata (buc)
23. LUCRARI SPECIALE	23.186.Montat etajera (buc)
23. LUCRARI SPECIALE	23.187. Reparat suport brat automatizare (buc)
23. LUCRARI SPECIALE	23.188. Polizat / taiat praguri usi (buc)
23. LUCRARI SPECIALE	23.189. Demontat cabina PVC (mp)
33. COFRAJE DIN BETON	33.12 Trasaje
23. LUCRARI SPECIALE	23.190 Montat Schela/ Carat
51. SUDURA	1.1 Sudat rectangulara
9. TENCUIELI DIN MORTAR	9.12. Driscuit
9. TENCUIELI DIN MORTAR	9.13. Montat coltar cu plasa
48.BOXE	48.5.  Rectificat/verificat suruburi
44. ACOPERIS DIN LEMN	44.8. Debitat OSB
10. TERMOSISTEM	10.10 Aplicat picurator
10. TERMOSISTEM	10.11. Driscuit
22. DECOPERTARI	22.19. Decopertat tabla
46. TAMPLARIE PVC	46.5. Montat sticla
52. VOPSEA DECORTIVA	52.1 Aplicat amorsa
52. VOPSEA DECORTIVA	52.2 Aplicat vopsea decorativa
52. VOPSEA DECORTIVA	52.3 Driscuit
53. PLACARI DIN TEGO/PAL/OSB	53.2 Pacare cu placi din Tego/Pal/OSB
53. PLACARI DIN TEGO/PAL/OSB	53.1 Aplicat structura metalica/lemn
45. ZIDARIE DIN CARAMIDA	45.3. Aplicat banda izolatoare
45. ZIDARIE DIN CARAMIDA	45.4. Chituit caramida
53. PLACARI DIN TEGO/PAL/OSB	53.2. Placare cu placi din TEGO/PAL/OSB
54. LAMBRIU	54.1 Aplicat structură din lemn
54. LAMBRIU	54.2 Aplicat lambriu
54. LAMBRIU	54.3. Aplicat folie anticondens
23. LUCRARI SPECIALE	23.191. Sabloane
28. CAMINE IRIGATIE	28.11. Montat capac metal
46. TAMPLARIE PVC	46.6.Debitat tamplarie
46. TAMPLARIE PVC	46.7 Asamblat tamplarie
23. LUCRARI SPECIALE	23.192 Curatat pomi
28. CAMINE IRIGATIE	28.12. Inaltat capac metalic
46. TAMPLARIE PVC	46.8 Montat manere + broaste
46. TAMPLARIE PVC	46.9 Montat balamale
46. TAMPLARIE PVC	46.10 Montat plexiglass
23. LUCRARI SPECIALE	23.193 Pozitionare mobilier
23. LUCRARI SPECIALE	23.194 Montat covor cauciuc
22. DECOPERTARI	22.20. Decopertat vopsea decorativa
23. LUCRARI SPECIALE	23.195. Montat cablu siliconic
23. LUCRARI SPECIALE	23.196 Spalat fatada
23. LUCRARI SPECIALE	23.197. Montat scafa PVC
23. LUCRARI SPECIALE	23.198 Spalat cofraje
40. PANOU SANDWICH	40.4 Aplicat sort tabla
18. CONFECTIE METALICA	18.26 Ajustare / completare structura metalica
33. COFRAJE DIN BETON	33.13.Aplicat Tego
23. LUCRARI SPECIALE	23.199. Aplicat sina inox
10. TERMOSISTEM	10.12. Aplicat izolatie bituminoasa
`;

// Map aliases from parsed list to operation names in DB
const OPERATION_ALIASES: Record<string, string> = {
  'TAMPLARIE PVC (mp)': 'TAMPLARIE PVC',
};

function normalizeOpName(name: string): string {
  const trimmed = name.trim();
  return OPERATION_ALIASES[trimmed] || trimmed;
}

// Try to extract a unit of measurement from the end of the string in parentheses
// Examples captured: (mp), (ml), (buc), (h), (mc), (mp/ml), (ml/mp), (buc/ml/mp), (ore)
function splitNameAndUnit(original: string): { name: string; unit: string | null } {
  let name = original.trim();
  let unit: string | null = null;
  // Find last (...) group
  const lastOpen = name.lastIndexOf('(');
  const lastClose = name.indexOf(')', lastOpen + 1);
  if (lastOpen !== -1 && lastClose !== -1 && lastClose > lastOpen) {
    const inside = name.slice(lastOpen + 1, lastClose).trim();
    const normalized = inside.replace(/\s+/g, '').toLowerCase();
    const looksLikeUnit = /^(mp|ml|mc|m|mm|cm|buc|h|ore|mp\/ml|ml\/mp|mp\/h|buc\/ml|buc\/mp|mp\/buc|ml\/buc|buc\/mp\/ml|mp\/ml\/buc|kg|tone|l|litri|mlitri|mp2|mp3)$/i.test(normalized) || /[a-zăâîșț]+(?:\/[a-zăâîșț]+)+/i.test(normalized);
    if (looksLikeUnit) {
  unit = inside;
  // Remove the unit parentheses but keep any trailing suffix
  name = (name.slice(0, lastOpen) + name.slice(lastClose + 1)).trim();
    }
  }
  return { name, unit };
}

// Robustly split a line into { opName, itemName }
function parseLine(line: string): { opName: string; itemName: string } | null {
  const s = line.trim();
  if (!s) return null;
  // Find the first subcode like 1.1 / 23.100 / 44.8.
  // Allow no space after subcode (e.g., "7.13.Debitat"), accept tab or space
  const sub = /(\d{1,3}(?:\.\d{1,3}){1,2})\.?[\t ]*/;
  const m = sub.exec(s);
  if (!m || m.index <= 0) return null;
  const leftRaw = s.slice(0, m.index).trim();
  const rightRaw = s.slice(m.index + m[0].length).trim();
  if (!leftRaw || !rightRaw) return null;

  const opName = leftRaw.replace(/^\d+\.?\s*/, '').trim(); // remove leading numbering like "1." or "39."
  const itemName = rightRaw.replace(/^\d{1,3}(?:\.\d{1,3}){1,2}\.?[\t ]*/, '').trim();
  if (!opName || !itemName) return null;
  return { opName, itemName };
}

function buildMap(raw: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const unparsed: string[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const p = parseLine(line);
    if (!p) {
      unparsed.push(line);
      continue;
    }
  const key = normalizeOpName(p.opName.trim());
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(p.itemName.trim());
  }
  if (unparsed.length) {
  console.warn(`${unparsed.length} lines couldn't be parsed. First few:`, unparsed.slice(0, 10));
  }
  return map;
}

async function main() {
  console.log('Parsing input lines...');
  const itemsByOperation = buildMap(RAW_LIST);
  console.log(`Found ${itemsByOperation.size} operations with items.`);

  console.log('🗄️  Loading operations from DB...');
  const ops = await prisma.operation.findMany();
  const opByName = new Map<string, { id: string; name: string }>();
  for (const o of ops) opByName.set(o.name.toUpperCase(), { id: o.id, name: o.name });

  let totalItems = 0;
  const missingOps: string[] = [];

  for (const [opName, itemsSet] of itemsByOperation) {
    const lookup = opByName.get(opName.toUpperCase());
    if (!lookup) {
      missingOps.push(opName);
      continue;
    }
    const items = Array.from(itemsSet).map((rawName) => {
      const { name, unit } = splitNameAndUnit(rawName);
      return { operationId: lookup.id, name, unit };
    });
    if (items.length === 0) continue;
    let res: any = { count: 0 };
    try {
      // cast to any to avoid potential TS intellisense mismatch in isolated files
      res = await (prisma as any).operationItem.createMany({ data: items, skipDuplicates: true });
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (/Unknown arg `unit`|Unknown argument/i.test(msg)) {
        const fallback = items.map(({ unit, ...rest }) => rest);
        res = await (prisma as any).operationItem.createMany({ data: fallback, skipDuplicates: true });
      } else {
        throw e;
      }
    }
    totalItems += res.count ?? 0;
  console.log(`${lookup.name}: inserted ${res.count} items (requested ${items.length})`);
  }

  if (missingOps.length) {
  console.warn(`\nMissing operations in DB (${missingOps.length}):`);
    for (const m of missingOps) console.warn('  -', m);
    console.warn('Tip: run scripts/add-operations.js first to create operations.');
  }

  console.log(`\nDone. Total new items inserted: ${totalItems}`);
}

main().catch((e) => {
  console.error('Failed to add operation items:', e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
