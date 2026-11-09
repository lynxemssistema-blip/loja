// ========================================================
// Arquivo de Inicialização para Deploy na Hostinger
// Domínio: loja.lynxems.com.br
// ========================================================

const path = require("path");
const fs = require("fs");

const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  require(standaloneServer);
} else {
  const { createServer } = require("http");
  const { parse } = require("url");
  const next = require("next");

  const dev = process.env.NODE_ENV !== "production";
  const hostname = process.env.HOSTNAME || "127.0.0.1";
  const port = parseInt(process.env.PORT, 10) || 31501;
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Erro na requisição:", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }).listen(port, hostname, () => {
      console.log(`> Loja Lynx rodando em http://${hostname}:${port}`);
    });
  });
}
