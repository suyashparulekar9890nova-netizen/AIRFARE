import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve client in production (e.g. Render / unified fullstack container)
const clientCandidates = [
  path.resolve(process.cwd(), "artifacts/airfare-index/dist/public"),
  path.resolve(process.cwd(), "../airfare-index/dist/public"),
];

const clientPath = clientCandidates.find((p) => fs.existsSync(p));

if (clientPath) {
  logger.info({ clientPath }, "Serving static client assets for production deployment");
  app.use(express.static(clientPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

export default app;
