// Utility functions for affiliate link management

interface AffiliateLink {
  id: string;
  domain: string;
  affiliate: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cache for affiliate links
let affiliateCache: AffiliateLink[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Load affiliate links with caching
async function loadAffiliateLinks(): Promise<AffiliateLink[]> {
  const now = Date.now();
  
  if (affiliateCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return affiliateCache;
  }
  
  try {
    const response = await fetch('/api/admin/affiliates');
    if (response.ok) {
      const data = await response.json();
      affiliateCache = data.affiliates || [];
      cacheTimestamp = now;
      return affiliateCache || [];
    }
  } catch (error) {
    console.error('Error loading affiliate links:', error);
  }
  
  return [];
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Apply affiliate extension to a URL if matching domain is found
export async function applyAffiliateLink(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) {
    return url;
  }
  
  const affiliates = await loadAffiliateLinks();
  const domain = extractDomain(url);
  
  const matchingAffiliate = affiliates.find(
    affiliate => affiliate.isActive && affiliate.domain === domain
  );
  
  if (matchingAffiliate) {
    const separator = url.includes('?') ? '&' : '?';
    const extension = matchingAffiliate.affiliate.startsWith('?') || matchingAffiliate.affiliate.startsWith('&')
      ? matchingAffiliate.affiliate.substring(1)
      : matchingAffiliate.affiliate;
    
    return `${url}${separator}${extension}`;
  }
  
  return url;
}

// Clear affiliate cache (useful when affiliates are updated)
export function clearAffiliateCache(): void {
  affiliateCache = null;
  cacheTimestamp = 0;
}