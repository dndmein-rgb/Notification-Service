import http from "node:http";
import { metricsText } from "./metrics.js";
import { getReadyStatus } from "./ready.js";
import { logger } from "../config/logger.js";
import { config } from "../config/index.js";

export function startOpsServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === "/metrics" && req.method === "GET") {
        const body = await metricsText();
        res.writeHead(200, {
          "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        });
        res.end(body);
        return;
      }
      if (req.url === "/ready" && req.method === "GET") {
        const result = await getReadyStatus({ includeKafka: true });
        res.writeHead(result.ready ? 200 : 503, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ status: result.ready ? "ready" : "not_ready", ...result }));
        return;
      }
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "notification-worker" }));
        return;
      }
      res.writeHead(404);
      res.end();
    } catch (err) {
      logger.error(err, "ops server error");
      res.writeHead(500);
      res.end();
    }
  });

  server.listen(config.METRICS_PORT, () => {
    logger.info(`Worker ops server on :${config.METRICS_PORT} (/metrics /ready)`);
  });

  return server;
}