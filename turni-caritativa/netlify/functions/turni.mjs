import { getStore } from "@netlify/blobs";

const risposta = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const store = getStore({ name: "turni", consistency: "strong" });

  if (req.method === "GET") {
    const mese = new URL(req.url).searchParams.get("mese") || "";
    if (!/^\d{4}-\d{2}$/.test(mese)) return risposta({ errore: "Mese non valido" }, 400);
    return risposta((await store.get(mese, { type: "json" })) || {});
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return risposta({ errore: "Richiesta non valida" }, 400); }

    const { data, turno, azione } = body;
    const nome = String(body.nome || "").trim().replace(/\s+/g, " ").slice(0, 40);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data || "")) return risposta({ errore: "Data non valida" }, 400);
    if (!/^[a-z0-9_-]{1,30}$/i.test(turno || "")) return risposta({ errore: "Turno non valido" }, 400);
    if (!nome) return risposta({ errore: "Nome mancante" }, 400);
    if (!["aggiungi", "rimuovi"].includes(azione)) return risposta({ errore: "Azione non valida" }, 400);

    const mese = data.slice(0, 7);
    const dati = (await store.get(mese, { type: "json" })) || {};
    const chiave = `${data}|${turno}`;
    const lista = dati[chiave] || [];
    const i = lista.findIndex(n => n.toLowerCase() === nome.toLowerCase());

    if (azione === "aggiungi" && i === -1) lista.push(nome);
    if (azione === "rimuovi" && i !== -1) lista.splice(i, 1);

    if (lista.length) dati[chiave] = lista;
    else delete dati[chiave];

    await store.setJSON(mese, dati);
    return risposta(dati);
  }

  return risposta({ errore: "Metodo non consentito" }, 405);
};

export const config = { path: "/api/turni" };