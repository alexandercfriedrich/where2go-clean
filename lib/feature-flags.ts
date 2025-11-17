/**
 * Feature Flag System for Discovery Homepage
 * Supports query parameter override and A/B testing
 */

'use client';

import { useState, useEffect } from 'react';

// Feature flag keys
export type FeatureFlag = 'discovery-homepage';

// A/B test variant types
export type ABVariant = 'control' | 'discovery';

/**
 * Check if discovery homepage feature is enabled
 * Priority: URL query param > A/B test variant
 */
export function useDiscoveryHomepage(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Check query parameter first
    const params = new URLSearchParams(window.location.search);
    if (params.get('discovery') === 'true') {
      setEnabled(true);
      return;
    }

    // Fall back to A/B test
    const variant = getABTestVariant('discovery-homepage');
    setEnabled(variant === 'discovery');
  }, []);

  return enabled;
}

/**
 * A/B Testing Hook
 * Deterministic assignment based on userId or random for anonymous users
 */
export function useABTest(testKey: string): ABVariant {
  const [variant, setVariant] = useState<ABVariant>('control');

  useEffect(() => {
    setVariant(getABTestVariant(testKey));
  }, [testKey]);

  return variant;
}

/**
 * Get A/B test variant assignment
 * Uses localStorage for persistence across sessions
 */
function getABTestVariant(testKey: string): ABVariant {
  const storageKey = `ab_test_${testKey}`;
  
  // Check if already assigned
  const stored = localStorage.getItem(storageKey);
  if (stored === 'control' || stored === 'discovery') {
    return stored as ABVariant;
  }

  // New assignment - deterministic based on user or random
  const userId = getUserId();
  let variant: ABVariant;

  if (userId) {
    // Deterministic hash for logged-in users
    const hash = simpleHash(userId + testKey);
    variant = hash % 2 === 0 ? 'control' : 'discovery';
  } else {
    // Random assignment for anonymous users (50/50 split)
    variant = Math.random() < 0.5 ? 'control' : 'discovery';
  }

  // Store for consistency
  localStorage.setItem(storageKey, variant);
  return variant;
}

/**
 * Get user ID from localStorage or cookie
 * Returns null for anonymous users
 */
function getUserId(): string | null {
  // Check for user ID in localStorage (adjust key based on your auth system)
  const userId = localStorage.getItem('userId');
  if (userId) {
    return userId;
  }

  // Could also check cookies here
  // const cookies = document.cookie.split(';');
  // ...

  return null;
}

/**
 * Simple hash function for deterministic variant assignment
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Server-side feature flag check
 * Can be extended to check environment variables or remote config
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Check environment variables
  const envKey = `NEXT_PUBLIC_FEATURE_${flag.toUpperCase().replace(/-/g, '_')}`;
  const envValue = process.env[envKey];
  
  if (envValue === 'true') {
    return true;
  }
  
  if (envValue === 'false') {
    return false;
  }

  // Default: discovery homepage is enabled
  if (flag === 'discovery-homepage') {
    return true;
  }

  return false;
}

/**
 * Reset A/B test assignment (useful for testing)
 */
export function resetABTest(testKey: string): void {
  const storageKey = `ab_test_${testKey}`;
  localStorage.removeItem(storageKey);
}
