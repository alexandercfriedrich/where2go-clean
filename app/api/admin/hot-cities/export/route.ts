import { NextRequest, NextResponse } from 'next/server';
import { loadHotCities } from '@/lib/hotCityStore';

/**
 * GET /api/admin/hot-cities/export - Export hot cities to XML format
 * This provides a backup that can be used to restore configuration
 */
export async function GET(request: NextRequest) {
  try {
    const cities = await loadHotCities();
    
    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<hotCities>
  <exportDate>${new Date().toISOString()}</exportDate>
  <cities>
${cities.map(city => `    <city>
      <id>${escapeXml(city.id)}</id>
      <name>${escapeXml(city.name)}</name>
      <country>${escapeXml(city.country || '')}</country>
      <isActive>${city.isActive}</isActive>
      <defaultSearchQuery>${escapeXml(city.defaultSearchQuery || '')}</defaultSearchQuery>
      <customPrompt>${escapeXml(city.customPrompt || '')}</customPrompt>
      <createdAt>${city.createdAt.toISOString()}</createdAt>
      <updatedAt>${city.updatedAt.toISOString()}</updatedAt>
      <websites>
${city.websites.map(website => `        <website>
          <id>${escapeXml(website.id)}</id>
          <name>${escapeXml(website.name)}</name>
          <url>${escapeXml(website.url)}</url>
          <categories>${website.categories.map(c => escapeXml(c)).join(',')}</categories>
          <description>${escapeXml(website.description || '')}</description>
          <searchQuery>${escapeXml(website.searchQuery || '')}</searchQuery>
          <priority>${website.priority}</priority>
          <isActive>${website.isActive}</isActive>
          <isVenue>${website.isVenue || false}</isVenue>
          <isVenuePrioritized>${website.isVenuePrioritized || false}</isVenuePrioritized>
        </website>`).join('\n')}
      </websites>
      <venues>
${(city.venues || []).map(venue => `        <venue>
          <id>${escapeXml(venue.id)}</id>
          <name>${escapeXml(venue.name)}</name>
          <categories>${venue.categories.map(c => escapeXml(c)).join(',')}</categories>
          <description>${escapeXml(venue.description || '')}</description>
          <priority>${venue.priority}</priority>
          <isActive>${venue.isActive}</isActive>
          <address>
            <full>${escapeXml(venue.address.full)}</full>
            <street>${escapeXml(venue.address.street)}</street>
            <houseNumber>${escapeXml(venue.address.houseNumber)}</houseNumber>
            <postalCode>${escapeXml(venue.address.postalCode)}</postalCode>
            <city>${escapeXml(venue.address.city)}</city>
            <country>${escapeXml(venue.address.country)}</country>
          </address>
          <website>${escapeXml(venue.website || '')}</website>
          <eventsUrl>${escapeXml(venue.eventsUrl || '')}</eventsUrl>
          <aiQueryTemplate>${escapeXml(venue.aiQueryTemplate || '')}</aiQueryTemplate>
        </venue>`).join('\n')}
      </venues>
    </city>`).join('\n')}
  </cities>
</hotCities>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="hot-cities-backup-${new Date().toISOString().split('T')[0]}.xml"`
      }
    });
  } catch (error) {
    console.error('Error exporting hot cities:', error);
    return NextResponse.json(
      { error: 'Failed to export hot cities' },
      { status: 500 }
    );
  }
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
