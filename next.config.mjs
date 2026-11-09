/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
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
