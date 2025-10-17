/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: (process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, ''),
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: [
    '/admin',
    '/admin/*',
    '/api',
    '/api/*',
    '/_next',
    '/_next/*',
    '/404',
    '/500',
    '/error',
    '/draft',
    '/draft/*',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: ['/admin', '/api'],
      },
    ],
    additionalSitemaps: [],
  },
  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: path === '/' ? 'daily' : 'daily',
      priority: path === '/' ? 1.0 : 0.7,
      lastmod: new Date().toISOString(),
    }
  },
}
