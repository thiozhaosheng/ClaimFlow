require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const authService = require("./src/authService");
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

app.use(express.json({ limit: "1mb" }));

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
app.post("/api/users/login", authLimiter, authService.login);
app.post("/api/users/register", authLimiter, authService.register);
app.patch("/api/users/update-password", authLimiter, authService.updatePassword);

// General API endpoints — loose throttle
app.get("/api/claims", apiLimiter, authService.getAllClaims);
app.post("/api/claims", apiLimiter, authService.createClaim);
app.patch("/api/workflow/review/:id", apiLimiter, authService.reviewClaim);
app.get("/api/claims/:id/receipt", apiLimiter, authService.getReceiptViewUrl);

// Receipt OCR upload — same size/type limits as the Base Service so bad
// uploads are rejected here instead of wasting a round trip.
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (
      /^image\/(jpe?g|png|webp|heic|heif)$/.test(file.mimetype) ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WEBP, HEIC, or PDF receipts are accepted"));
    }
  },
});

const handleMulterError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Receipt must be 10 MB or smaller"
        : "Invalid receipt upload";
    return res.status(400).json({ status: "error", message });
  }
  if (err instanceof Error) {
    return res.status(400).json({ status: "error", message: err.message });
  }
  next(err);
};

app.post(
  "/api/claims/parse-receipt",
  apiLimiter,
  receiptUpload.single("receipt"),
  handleMulterError,
  authService.parseReceipt,
);

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
