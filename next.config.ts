import type { NextConfig } from "next";

// Files in public/ are served with "max-age=0" by default, so every visit
// re-validates hundreds of images, videos and sounds. In production they are
// marked immutable for a year instead.
//
// Consequence: a file replaced in place under the same name will NOT reach
// returning players until their cache expires. Ship a changed asset under a
// new file name (or a ?v= query) rather than overwriting it.
// Development keeps the default so edited assets show up on reload.
const immutableAssetHeaders = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];

    return ["/images/:path*", "/videos/:path*", "/audio/:path*"].map((source) => ({
      source,
      headers: immutableAssetHeaders,
    }));
  },
};

export default nextConfig;
