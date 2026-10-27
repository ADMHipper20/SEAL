import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
};

export default nextConfig;
