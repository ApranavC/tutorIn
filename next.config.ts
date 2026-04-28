import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep false: VideoSDK's MeetingProvider with joinWithoutUserInteraction
  // does not support React 18 strict-mode double-mount (causes duplicate join)
  reactStrictMode: false,
};

export default nextConfig;
