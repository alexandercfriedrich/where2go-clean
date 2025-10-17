import { generateSeoPaths } from '@/lib/seoPaths';

export async function GET() {
  const baseUrl = (process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, '');

  try {
    const paths = await generateSeoPaths(10000);
    const today = new Date().toISOString().split('T')[0];

    const escapeAndEncode = (p: string) => {
      // Remove whitespace and line breaks from path and ensure a leading slash
      const raw = String(p || '').trim();
      const cleaned = raw.startsWith('/') ? raw : `/${raw}`;
      // encodeURI preserves valid path slashes but encodes unsafe characters
      return `${baseUrl}${encodeURI(cleaned)}`;
    };

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url>\n    <loc>${escapeAndEncode(p)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.7'}</priority>\n  </url>`).join('\n')}\n</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (e) {
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`;
    return new Response(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8'
      }
    });
  }
}
