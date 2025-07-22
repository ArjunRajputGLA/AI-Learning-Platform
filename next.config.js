/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'media.licdn.com',
      'lh3.googleusercontent.com',
      'platform-lookaside.fbsbx.com',
      'avatars.githubusercontent.com',
      'scontent.fagr1-3.fna.fbcdn.net',
      'scontent.fblr1-3.fna.fbcdn.net',
      'scontent.fblr2-1.fna.fbcdn.net',
      'graph.facebook.com',
      'example.com',
      'localhost'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ],
  },
}

module.exports = nextConfig
