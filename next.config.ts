import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output reduces deployment size on Render/Docker
  output: "standalone",

  // Ensure Prisma and native modules work correctly in serverless environments
  serverExternalPackages: ["@prisma/client", "bcryptjs", "kafkajs", "nodemailer", "redis"],

  // Disable X-Powered-By header to avoid exposing framework
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Strict TypeScript during build
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
