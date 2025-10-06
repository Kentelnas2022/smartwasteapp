import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "via.placeholder.com", // still allowed
      },
      {
        protocol: "https",
        hostname: "svfakvraghxssfpyvert.supabase.co", // 👈 add your Supabase domain
      },
    ],
  },
};

export default nextConfig;
