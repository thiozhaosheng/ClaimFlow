require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";

module.exports = {
  nodeEnv: NODE_ENV,
  gatewayPort: parseInt(process.env.PORT || "3001", 10),
  baseServiceProtocol: process.env.BASE_SERVICE_PROTOCOL || "http",
  baseServiceHost: process.env.BASE_SERVICE_HOST || "claimflow-base.azurewebsites.net",
  baseServicePort: parseInt(process.env.BASE_SERVICE_PORT || "3000", 10),
  baseServiceTimeout: parseInt(process.env.BASE_SERVICE_TIMEOUT || "120000", 10),

  // CORS allowlist (comma-separated origins)
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  staticFolder: process.env.STATIC_FOLDER || "test",
};
