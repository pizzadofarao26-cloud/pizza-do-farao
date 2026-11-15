// Pergunta para a InfinitePay se o pagamento foi realmente feito.

const INFINITE_TAG = "pizzadofarao";

const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  let c;
  try { c = await req.json(); } catch { return json({ erro: "Pedido inválido" }, 400); }

  const limpa = (v) => String(v || "").trim().slice(0, 120);
  const order_nsu = limpa(c.order_nsu), transaction_nsu = limpa(c.transaction_nsu), slug = limpa(c.slug);
  if (!order_nsu || !transaction_nsu || !slug) return json({ pago: false, erro: "Dados do pagamento incompletos" }, 400);

  try {
    const r = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: INFINITE_TAG, order_nsu, transaction_nsu, slug }),
    });
    const d = await r.json().catch(() => ({}));
    // A InfinitePay responde 200 mesmo quando não pagou: o que vale é success + paid.
    const pago = r.ok && d.success === true && d.paid === true;
    return json({ pago, valor: Number(d.amount) || 0, metodo: d.capture_method || "" });
  } catch (e) {
    console.error("Falha ao verificar:", e);
    return json({ pago: false, erro: "Sem conexão com a InfinitePay." }, 502);
  }
};
