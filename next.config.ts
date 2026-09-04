import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tensorflow/tfjs", "@tensorflow-models/coco-ssd"],
};

export default nextConfig;
