import { createApp } from "./app.mjs";
const { app, db } = createApp({
  dataDir: process.env.DATA_DIR,
  production: process.env.NODE_ENV === "production",
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || 0),
});
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Dareme server listening on port ${port}`),
);
const shutdown = () =>
  server.close(() => {
    db.close();
    process.exit(0);
  });
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
