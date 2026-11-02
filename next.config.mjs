/** @type {import('next').NextConfig} */
const isExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isExport ? { output: "export", distDir: ".next-export", trailingSlash: true, images: { unoptimized: true }, ...(basePath ? { basePath, assetPrefix: basePath } : {}) } : {}),
};
export default nextConfig;
