export async function GET() {
  const site = (process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, '');
  const body = `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
