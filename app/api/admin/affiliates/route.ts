import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AFFILIATES_FILE = path.join(process.cwd(), 'data', 'affiliates.json');

interface AffiliateLink {
  id: string;
  domain: string;
  affiliate: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(AFFILIATES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load affiliates from file
function loadAffiliates(): AffiliateLink[] {
  ensureDataDirectory();
  
  if (!fs.existsSync(AFFILIATES_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(AFFILIATES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading affiliates:', error);
    return [];
  }
}

// Save affiliates to file
function saveAffiliates(affiliates: AffiliateLink[]) {
  ensureDataDirectory();
  
  try {
    fs.writeFileSync(AFFILIATES_FILE, JSON.stringify(affiliates, null, 2));
  } catch (error) {
    console.error('Error saving affiliates:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const affiliates = loadAffiliates();
    return NextResponse.json({ affiliates });
  } catch (error) {
    console.error('Error in GET /api/admin/affiliates:', error);
    return NextResponse.json(
      { error: 'Failed to load affiliates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const affiliateData: AffiliateLink = await request.json();
    
    // Validate required fields
    if (!affiliateData.domain || !affiliateData.affiliate) {
      return NextResponse.json(
        { error: 'Missing required fields: domain, affiliate' },
        { status: 400 }
      );
    }
    
    const affiliates = loadAffiliates();
    
    // Clean domain (remove protocol, www, trailing slash)
    affiliateData.domain = affiliateData.domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
    
    // Generate ID if not present (for new affiliates)
    if (!affiliateData.id) {
      affiliateData.id = `affiliate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      affiliateData.createdAt = new Date().toISOString();
    }
    
    // Update timestamp
    affiliateData.updatedAt = new Date().toISOString();
    
    const existingIndex = affiliates.findIndex(a => a.id === affiliateData.id);
    
    if (existingIndex >= 0) {
      // Update existing affiliate
      affiliates[existingIndex] = affiliateData;
    } else {
      // Add new affiliate
      affiliates.push(affiliateData);
    }
    
    saveAffiliates(affiliates);
    
    return NextResponse.json({ success: true, affiliate: affiliateData });
  } catch (error) {
    console.error('Error in POST /api/admin/affiliates:', error);
    return NextResponse.json(
      { error: 'Failed to save affiliate' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const affiliateId = searchParams.get('id');
    
    if (!affiliateId) {
      return NextResponse.json(
        { error: 'Missing affiliate ID' },
        { status: 400 }
      );
    }
    
    const affiliates = loadAffiliates();
    const filteredAffiliates = affiliates.filter(a => a.id !== affiliateId);
    
    if (affiliates.length === filteredAffiliates.length) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }
    
    saveAffiliates(filteredAffiliates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/affiliates:', error);
    return NextResponse.json(
      { error: 'Failed to delete affiliate' },
      { status: 500 }
    );
  }
}