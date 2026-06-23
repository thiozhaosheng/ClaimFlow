import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't get confused by the sibling
  // Vite app's lockfile in the parent repo.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
