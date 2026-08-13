import { db } from "./index.ts";
import { scripts } from "./schema.ts";

const seedScripts = [
  {
    title: "La tecnologia è la parte facile",
    format: "Video lungo" as const,
    status: "Pronto" as const,
    source: "Copione H-FARM",
    tags: ["AI", "Adozione", "H-FARM"],
    body: "[NON LEGGERE]\nTono lento e conversazionale. Guarda in camera.\n\nFaccio un mestiere nuovo,\nper il quale non esiste ancora un percorso prestabilito.\n\nMi occupo di intelligenza artificiale,\nma ci arrivo dalla filosofia, oltre che dall’informatica.\n\n[PAUSA BREVE]\n\nQuando parlo di AI in azienda,\nnon parlo per sentito dire.\n\nLa mattina devo farla funzionare anch’io,\nin mezzo agli ordini, alle consegne e ai problemi veri.\n\n[PAUSA LUNGA]\n\nSe dovessi riassumere tutto in una frase,\ndirei questa:\n\n[RALLENTA]\n\nLa tecnologia è la parte facile.\nL’adozione è il mestiere.\n\n[PAUSA LUNGA]\n\nPer molto tempo abbiamo comprato tecnologie\nche facevano più velocemente cose che sapevamo già fare.\n\nIl gestionale al posto del registro.\nLa mail al posto del fax.\n\nL’intelligenza artificiale è diversa.\n\nEntra nel punto in cui una persona pensa:\ndove decide cosa scrivere, cosa proporre e di cosa fidarsi.\n\nÈ la prima tecnologia\nche si siede accanto al giudizio delle persone.\n\n[PAUSA BREVE]\n\nPer questo l’AI non si installa e basta.\nSi attraversa.",
  },
  {
    title: "L’AI non è una strategia",
    format: "Reel" as const,
    status: "Pronto" as const,
    source: "Scritto in Script Studio",
    tags: ["LinkedIn", "Strategia"],
    body: "L’intelligenza artificiale non è una strategia.\n\n[PAUSA BREVE]\n\nÈ un acceleratore.\n\nE se la direzione è sbagliata,\nti farà arrivare prima nel posto sbagliato.\n\n[PAUSA LUNGA]\n\nMolte aziende partono dalla domanda più comoda:\n“Quale strumento compriamo?”\n\nMa la domanda utile è un’altra:\n“Quale decisione vogliamo prendere meglio?”\n\n[RALLENTA]\n\nPrima viene il problema.\nPoi il processo.\nPoi i dati.\nSolo alla fine viene il modello.\n\nAltrimenti l’AI non trasforma l’azienda.\nAutomatizza la confusione.",
  },
  {
    title: "Magnifica Humanitas, Terribilis Machinae",
    format: "Video lungo" as const,
    status: "Bozza" as const,
    source: "Importato da Claude",
    tags: ["Umanesimo digitale", "Newsletter"],
    body: "[NON LEGGERE]\nInquadratura stretta. Nessuna musica all’inizio.\n\nAbbiamo passato gli ultimi settant’anni\na insegnare alle macchine a pensare.\n\n[PAUSA LUNGA]\n\nOra dobbiamo decidere che cosa significhi restare umani\nquando pensare non è più un nostro monopolio.\n\nNon è una domanda tecnica.\n\nÈ una domanda politica, economica\ne perfino spirituale.\n\n[RALLENTA]\n\nOgni tecnologia abbastanza potente\nnon cambia soltanto ciò che possiamo fare.\n\nCambia ciò che crediamo di essere.",
  },
  {
    title: "Le metriche che rendono credibile un MVP AI",
    format: "Lezione" as const,
    status: "Da rivedere" as const,
    source: "Importato via MCP",
    tags: ["Exanova", "Startup", "KPI"],
    body: "Un MVP non serve a dimostrare\nche sai costruire software.\n\n[PAUSA BREVE]\n\nServe a ridurre una specifica incertezza.\n\nPer questo le metriche non si scelgono dopo il prodotto.\nSi progettano insieme al prodotto.\n\n[RALLENTA]\n\nTempo risparmiato.\nQualità della risposta.\nFrequenza d’uso.\nAttività completate senza correzioni.\n\nQuesti numeri raccontano una storia più credibile\ndi qualunque demo perfetta.",
  },
];

async function main() {
  const existing = await db.select().from(scripts).limit(1);
  if (existing.length > 0) {
    console.log("La tabella scripts ha già dati, seed saltato.");
    return;
  }
  await db.insert(scripts).values(seedScripts);
  console.log(`Inseriti ${seedScripts.length} script di esempio.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
