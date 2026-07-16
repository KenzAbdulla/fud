// @ts-check
import withSerwist from "@serwist/next";

const withSerwistConfig = withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { hostname: "*.swiggy.com" },
      { hostname: "*.swiggystatic.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@modelcontextprotocol/sdk"],
  },
};

export default withSerwistConfig(nextConfig);
