// Cria uma cobrança na InfinitePay (Checkout Integrado) com os preços do servidor.
// O cliente não consegue alterar o valor: o preço é calculado aqui, não no navegador.

const INFINITE_TAG = "pizzadofarao";

// Preços em centavos. MANTENHA IGUAL AO index.html quando mudar um preço.
const PIZZAS = {
  anubis:     { nome: "Anúbis",     preco: 8000 },
  nefertiti:  { nome: "Nefertiti",  preco: 6500 },
  sobek:      { nome: "Sobek",      preco: 7000 },
  hatshepsut: { nome: "Hatshepsut", preco: 6500 },
  ramses:     { nome: "Ramsés",     preco: 7500 },
  thoth:      { nome: "Thoth",      preco: 7500 },
  tutancamon: { nome: "Tutancâmon", preco: 7500 },
  hathor:     { nome: "Hathor",     preco: 6500 },
  isis:       { nome: "Ísis",       preco: 7000 },
  cleopatra:  { nome: "Cleópatra",  preco: 6500 },
  horus:      { nome: "Hórus",      preco: 9000 },
  amon:       { nome: "Ámon",       preco: 7000 },
  osiris:     { nome: "Osíris",     preco: 6500 },
  aquenaton:  { nome: "Aquenaton",  preco: 9000 },
};

const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  let corpo;
  try { corpo = await req.json(); } catch { return json({ erro: "Pedido inválido" }, 400); }

  const lista = Array.isArray(corpo.itens) ? corpo.itens : [];
  if (!lista.length || lista.length > 30) return json({ erro: "Carrinho vazio ou grande demais" }, 400);

  const items = [];
  let total = 0;
  for (const it of lista) {
    const sabores = Array.isArray(it.sabores) ? it.sabores.slice(0, 2) : [];
    const qtd = Math.floor(Number(it.qtd));
    if (!sabores.length || !sabores.every((s) => PIZZAS[s]) || !(qtd >= 1 && qtd <= 20)) {
      return json({ erro: "Item inválido no carrinho" }, 400);
    }
    const preco = Math.max(...sabores.map((s) => PIZZAS[s].preco)); // meio a meio: vale o mais caro
    const descricao = sabores.length === 2
      ? `Pizza ½ ${PIZZAS[sabores[0]].nome} + ½ ${PIZZAS[sabores[1]].nome}`
      : `Pizza ${PIZZAS[sabores[0]].nome}`;
    items.push({ description: descricao, price: preco, quantity: qtd });
    total += preco * qtd;
  }

  const order_nsu = "FARAO-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const origem = new URL(req.url).origin;

  const payload = {
    handle: INFINITE_TAG,
    order_nsu,
    items,
    redirect_url: `${origem}/`,
  };
  const nome = String(corpo.nome || "").trim().slice(0, 80);
  if (nome) payload.customer = { name: nome };

  try {
    const r = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const dados = await r.json().catch(() => ({}));
    const url = dados.url || dados.link || dados.checkout_url;
    if (!r.ok || !url) {
      console.error("InfinitePay recusou:", r.status, JSON.stringify(dados));
      return json({ erro: "Não foi possível gerar o pagamento agora." }, 502);
    }
    return json({ url, order_nsu, total });
  } catch (e) {
    console.error("Falha ao falar com a InfinitePay:", e);
    return json({ erro: "Sem conexão com a InfinitePay." }, 502);
  }
};
