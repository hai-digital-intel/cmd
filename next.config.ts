import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "archiver"],
  // Server Actions default to a 1 MB body, which would reject ordinary signed PDFs; sized just
  // above MAX_UPLOAD_BYTES (lib/uploadPolicy.ts) to allow for multipart overhead.
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
};

export default nextConfig;
