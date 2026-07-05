import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";

import askDifyHandler from "../api/ask-dify.js";

const apiPort = Number(process.env.DCPI_API_PORT || 8787);
const vitePort = Number(process.env.DCPI_VITE_PORT || 5173);

const server = createServer((req, res) => {
  if (req.url === "/api/ask-dify") {
    void askDifyHandler(req, res);
    return;
  }
  res.statusCode = 404;
  res.end("not_found");
});

server.listen(apiPort);
await once(server, "listening");
console.log(`API listening on http://127.0.0.1:${apiPort}`);

const vite = spawn("npm", ["run", "dev", "--", "--host", "0.0.0.0", "--port", String(vitePort)], {
  stdio: "inherit",
});

const stop = () => {
  server.close();
  vite.kill("SIGTERM");
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
vite.on("exit", (code) => {
  server.close();
  process.exit(code || 0);
});
