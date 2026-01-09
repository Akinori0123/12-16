/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercelでのキャッシュ問題を回避するための設定
  experimental: {
    // App RouterでのStatic Route Segmentキャッシュを無効化
    staticWorkerRequestDeduping: false,
  },
  // 特定のパスでキャッシュを無効化
  async headers() {
    return [
      {
        // admin dashboardのキャッシュを無効化
        source: '/admin/dashboard',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Vercel-Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        // admin APIのキャッシュを無効化
        source: '/api/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Vercel-Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig