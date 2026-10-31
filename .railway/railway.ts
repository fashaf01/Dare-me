import { defineRailway, github, project, service, volume } from "railway/iac";

// This file describes paid resources; it does not deploy them by itself.
// Use a new, empty Railway project and inspect `railway config plan` before apply.
export default defineRailway(() => {
  const data = volume("dareme-data", { sizeMB: 1024 });
  const web = service("dareme", {
    source: github("fashaf01/Dare-me", { branch: "main", checkSuites: true }),
    build: {
      builder: "RAILPACK",
      buildCommand:
        "npm ci --include=dev --no-audit --no-fund && npm run build",
    },
    start: "npm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    replicas: 1,
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 5,
      requiredMountPath: "/data",
    },
    env: {
      NODE_ENV: "production",
      RAILPACK_NODE_VERSION: "24",
      DATA_DIR: "/data/dareme",
      PORT: "3001",
      TRUST_PROXY_HOPS: "1",
    },
    volumeMounts: {
      "dareme-data": { mountPath: "/data", backupSchedules: ["DAILY"] },
    },
  });
  return project("Dareme", { resources: [data, web] });
});
