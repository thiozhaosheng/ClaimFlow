require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[auth-gateway] Required env var "${key}" is not set.`);
  }
  return value;
};

const configuredForProduction = (key, developmentFallback) => {
  return NODE_ENV === "production" ? required(key) : process.env[key] || developmentFallback;
};

module.exports = {
  nodeEnv: NODE_ENV,
  gatewayPort: parseInt(process.env.PORT || "3001", 10),
  baseServiceProtocol: configuredForProduction("BASE_SERVICE_PROTOCOL", "http"),
  baseServiceHost: required("BASE_SERVICE_HOST"),
  baseServicePort: parseInt(configuredForProduction("BASE_SERVICE_PORT", "3000"), 10),
  baseServiceTimeout: parseInt(process.env.BASE_SERVICE_TIMEOUT || "120000", 10),

  // CORS allowlist (comma-separated origins)
  corsOrigins: configuredForProduction("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  staticFolder: process.env.STATIC_FOLDER || "test",
};
