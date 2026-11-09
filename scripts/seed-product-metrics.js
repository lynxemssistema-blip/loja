const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", ".data", "parceiro-lynx-db.json");

if (!fs.existsSync(dbPath)) {
  console.error("Arquivo do banco não encontrado:", dbPath);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
if (!db.products || !Array.isArray(db.products)) {
  console.error("Nenhum produto cadastrado no banco.");
  process.exit(1);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 1. Aplica as métricas aleatórias nos produtos existentes
db.products = db.products.map((p) => {
  const isSinco =
    p.id === "prod-1794226878875-fbmz" ||
    (p.title && p.title.toLowerCase().includes("sinco")) ||
    (p.description && p.description.toLowerCase().includes("sinco"));

  if (isSinco) {
    return {
      ...p,
      order: 1,
      clicks_count: 1240, // Líder absoluto
      sales_count: 310,  // Líder absoluto
      rating: 5.0,
      reviews_count: 215,
      badge: "🏆 #1 Mais Visitado & Vendido",
      updated_at: new Date().toISOString(),
    };
  }

  // Demais produtos: valores aleatórios em torno de 150 vendas e 635 clicks
  const clicks = randInt(590, 680);
  const sales = randInt(138, 168);
  const rating = Number((4.7 + Math.random() * 0.25).toFixed(1)); // 4.7 a 4.9
  const reviews = randInt(75, 135);

  return {
    ...p,
    order: p.order && p.order > 1 ? p.order : 99,
    clicks_count: clicks,
    sales_count: sales,
    rating: Math.min(5.0, rating),
    reviews_count: reviews,
    updated_at: new Date().toISOString(),
  };
});

// 2. Ordena os produtos colocando o SINCO rigorosamente em PRIMEIRO LUGAR,
// seguido pelos mais visitados/clicados
db.products.sort((a, b) => {
  const isSincoA =
    a.id === "prod-1794226878875-fbmz" ||
    (a.description && a.description.toLowerCase().includes("sinco"));
  const isSincoB =
    b.id === "prod-1794226878875-fbmz" ||
    (b.description && b.description.toLowerCase().includes("sinco"));

  if (isSincoA) return -1;
  if (isSincoB) return 1;

  // Depois ordena por cliques decrescente
  return (b.clicks_count || 0) - (a.clicks_count || 0);
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");

console.log("Sucesso! Métricas aplicadas em", db.products.length, "produtos.");
console.log("Top 3 produtos:");
db.products.slice(0, 3).forEach((p, idx) => {
  console.log(
    `#${idx + 1}: [${p.id}] ${p.title.slice(0, 45)}... | Clicks: ${p.clicks_count} | Vendas: ${p.sales_count} | Rating: ${p.rating}★`
  );
});
