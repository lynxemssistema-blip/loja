/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async headers() {
    return [
      {
        source: "/loja",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/loja",
        permanent: false,
      },
      {
        source: "/catalogo",
        destination: "/loja",
        permanent: true,
      },
      {
        source: "/admin",
        destination: "/painel",
        permanent: false,
      },
      {
        source: "/login",
        destination: "/painel",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
