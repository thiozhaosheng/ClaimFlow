import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't get confused by the sibling
  // Vite app's lockfile in the parent repo.
  turbopack: {
    root: path.join(__dirname),
  },
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "192.168.0.12:3000",
    "192.168.0.12",
  ],
};

export default nextConfig;
