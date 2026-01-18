import type { NextConfig } from "next";

// 使用环境变量控制 basePath/assetPrefix 以兼容 GitHub Pages 子路径
const repoName = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/^\/+|\/+$/g, "") || "";
const normalizedBasePath = repoName ? `/${repoName}` : undefined;

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: normalizedBasePath,
  assetPrefix: normalizedBasePath,
};

export default nextConfig;
