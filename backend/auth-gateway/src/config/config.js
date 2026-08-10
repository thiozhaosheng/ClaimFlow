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
  // 4000, matching frontend/.env.example. The previous 3001 default collided
  // with nothing but matched nothing either: the frontend calls 4000, so a
  // gateway started without PORT set answered on a port no client used.
  gatewayPort: parseInt(process.env.PORT || "4000", 10),

  // Defaults to localhost so an unconfigured gateway fails against a service
  // you can see. The previous default was "claimflow-base.azurewebsites.net",
  // a hostname that no longer resolves — so a missing BASE_SERVICE_HOST
  // produced DNS failures against a dead remote rather than an obvious local
  // misconfiguration. Production sets this explicitly.
  baseServiceHost: process.env.BASE_SERVICE_HOST || "localhost",
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
