const http = require("http");
const https = require("https");
const config = require("./config/config");
const logUtil = require("./logUtil");

const protocol = config.baseServiceProtocol.replace(/:$/, "").toLowerCase();
const transport = protocol === "https" ? https : http;

if (protocol !== "http" && protocol !== "https") {
  throw new Error(`[auth-gateway] Unsupported BASE_SERVICE_PROTOCOL "${config.baseServiceProtocol}"`);
}

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function filteredHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase())),
  );
}

module.exports = function proxyRequest(req, res) {
  const headers = filteredHeaders(req.headers);
  headers.host = config.baseServiceHost;
  headers["x-forwarded-host"] = req.get("host");
  headers["x-forwarded-proto"] = req.protocol;

  const options = {
    hostname: config.baseServiceHost,
    port: config.baseServicePort,
    path: req.originalUrl,
    method: req.method,
    headers,
    timeout: config.baseServiceTimeout,
  };

  logUtil.info(`[Proxy] ${req.method} ${req.originalUrl} -> ${protocol}://${config.baseServiceHost}:${config.baseServicePort}`);

  const upstream = transport.request(options, (upstreamResponse) => {
    res.writeHead(upstreamResponse.statusCode || 502, filteredHeaders(upstreamResponse.headers));
    upstreamResponse.pipe(res);
  });

  upstream.on("timeout", () => {
    upstream.destroy(new Error("Upstream request timed out"));
  });

  upstream.on("error", (err) => {
    logUtil.error("[Proxy] API request failed", err.message);
    if (!res.headersSent) {
      res.status(502).json({ status: "error", message: "API service unavailable" });
    } else {
      res.destroy(err);
    }
  });

  req.pipe(upstream);
};
