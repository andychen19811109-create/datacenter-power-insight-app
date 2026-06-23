import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, loadEnv } from "vite";

import askDifyHandler from "../api/ask-dify.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const env = loadEnv("", projectRoot, "");
Object.entries(env).forEach(([key, value]) => {
  if (!(key in process.env)) process.env[key] = value;
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const readRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
};

const createVercelLikeResponse = (nodeRes) => ({
  status(code) {
    nodeRes.statusCode = code;
    return this;
  },
  setHeader(name, value) {
    nodeRes.setHeader(name, value);
    return this;
  },
  json(payload) {
    if (!nodeRes.headersSent) nodeRes.setHeader("Content-Type", "application/json; charset=utf-8");
    nodeRes.end(JSON.stringify(payload));
    return this;
  },
  send(payload) {
    nodeRes.end(payload);
    return this;
  },
});

const vite = await createViteServer({
  root: projectRoot,
  server: {
    middlewareMode: true,
    hmr: false,
  },
  appType: "custom",
});

const serveIndexHtml = async (req, res) => {
  const template = await readFile(path.join(projectRoot, "index.html"), "utf8");
  const html = await vite.transformIndexHtml(req.url || "/", template);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
};

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";

  if (url === "/api/ask-dify") {
    const body = req.method === "POST" ? await readRequestBody(req) : undefined;
    const request = { ...req, body };
    const response = createVercelLikeResponse(res);
    await askDifyHandler(request, response);
    return;
  }

  vite.middlewares(req, res, async (err) => {
    if (err) {
      vite.ssrFixStacktrace(err);
      res.statusCode = 500;
      res.end(err.message);
      return;
    }

    const acceptsHtml = String(req.headers.accept || "").includes("text/html");
    const isPageRequest = (req.method === "GET" || req.method === "HEAD")
      && acceptsHtml
      && !url.startsWith("/@")
      && !url.startsWith("/src/")
      && !url.includes(".")
      && !url.startsWith("/api/");

    if (isPageRequest) {
      await serveIndexHtml(req, res);
      return;
    }

    if (!res.writableEnded) {
      res.statusCode = 404;
      res.end("Not Found");
    }
  });
});

server.listen(port, host, () => {
  console.log(`PowerInsight local dev server with API listening on http://${host}:${port}`);
});
