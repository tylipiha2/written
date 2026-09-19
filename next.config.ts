import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // Explicit rather than relying on the (already-false) default, so it's
    // unambiguous that console output is never stripped in this app.
    removeConsole: false,
  },
};

export default nextConfig;
