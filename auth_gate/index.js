require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const authService = require("./src/authService");
const logUtil = require("./src/logUtil");
const config = require("./src/config/config");

const app = express();
const PORT = config.gatewayPort;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logUtil.info(`[Gateway] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, config.staticFolder)));

app.post("/api/users/login", authService.login);
app.post("/api/users/register", authService.register);
app.patch("/api/users/update-password", authService.updatePassword);

app.get("/api/claims", authService.getAllClaims);
app.post("/api/claims", authService.createClaim);

app.patch("/api/workflow/review/:id", authService.reviewClaim);

app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Endpoint not found" });
});

module.exports = app;

app.listen(PORT, () => {
  logUtil.info(`Auth Gateway is LIVE on port ${PORT}`);
});
