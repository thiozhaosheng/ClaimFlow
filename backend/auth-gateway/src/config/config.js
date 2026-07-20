require("dotenv").config();

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[auth-gateway] Required env var "${key}" is not set. ` +
        `Copy backend/auth-gateway/.env.example to backend/auth-gateway/.env and fill it in.`,
    );
  }
  return value;
};

const NODE_ENV = process.env.NODE_ENV || "development";

module.exports = {
  nodeEnv: NODE_ENV,
  gatewayPort: parseInt(process.env.PORT || "3001", 10),
  baseServiceHost: process.env.BASE_SERVICE_HOST || "claimflow-base.azurewebsites.net",
  baseServicePort: parseInt(process.env.BASE_SERVICE_PORT || "3000", 10),
  baseServiceTimeout: parseInt(process.env.BASE_SERVICE_TIMEOUT || "5000", 10),

  // Secret — no fallback. Service refuses to boot without it.
  jwtSecret: required("JWT_SECRET"),

  // CORS allowlist (comma-separated origins)
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  staticFolder: process.env.STATIC_FOLDER || "../../frontend/dist",
};
