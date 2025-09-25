/**
 * Utility functions for the application
 */

export const generateId = () => `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
export const generateWebsiteId = () => `website-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;