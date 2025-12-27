import cors from "cors";
import express from "express";

const app = express();
const port = 3101;

app.use(cors({ origin: "http://localhost:5173" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
