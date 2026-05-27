require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const proxyRequest = require("./src/proxy");
const logUtil = require("./src/logUtil");
const config = require("./src/config/config");

const app = express();
const PORT = config.gatewayPort;
const isProduction = config.nodeEnv === "production";

app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      if (isProduction) {
        return callback(new Error("Origin required in production"));
      }
      return callback(null, true);
    }
    if (config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin "${origin}" not in allowlist`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

app.use((req, _res, next) => {
  logUtil.info(`[Gateway] ${req.method} ${req.url}`);
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { status: "error", message: "Too many login attempts. Try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { status: "error", message: "Rate limit exceeded. Please slow down." },
});

app.use(express.static(path.join(__dirname, config.staticFolder)));

// Auth endpoints — strict per-IP throttle
app.use("/api/auth/login", authLimiter);

// General API endpoints — loose throttle
app.use("/api", apiLimiter, proxyRequest);

app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Endpoint not found" });
});

app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith("CORS:")) {
    logUtil.error("[cors] blocked", err.message);
    return res.status(403).json({ status: "error", message: err.message });
  }
  logUtil.error("[error]", err);
  return res.status(500).json({
    status: "error",
    message: isProduction ? "Internal server error" : err.message,
  });
});

module.exports = app;

app.listen(PORT, () => {
  logUtil.info(`Auth Gateway is LIVE on port ${PORT} (${config.nodeEnv})`);
});
