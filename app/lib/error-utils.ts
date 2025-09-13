/**
 * Utility functions for handling and extracting error messages from API responses.
 * This module ensures that error objects are properly displayed as readable strings.
 */

/**
 * Extract a readable error message from various error types returned by the API.
 * 
 * @param error - The error object from the API response
 * @param fallbackMessage - Default message if no error message can be extracted
 * @returns A human-readable error message string
 */
export function extractErrorMessage(
  error: unknown, 
  fallbackMessage: string = 'Ein unbekannter Fehler ist aufgetreten'
): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }
  
  // If it's null or undefined, return fallback
  if (!error) {
    return fallbackMessage;
  }
  
  // If it's an object, try to extract message
  if (typeof error === 'object') {
    const errorObj = error as any;
    
    // Try to get message from structured error object
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    
    // Try to get details (for configuration errors)
    if (errorObj.details && typeof errorObj.details === 'string') {
      return errorObj.details;
    }
    
    // Try to get error from nested structure
    if (errorObj.error) {
      return extractErrorMessage(errorObj.error, fallbackMessage);
    }
    
    // If it has validation errors, format them
    if (errorObj.context?.errors && Array.isArray(errorObj.context.errors)) {
      const validationErrors = errorObj.context.errors
        .map((err: any) => {
          if (typeof err === 'string') {
            // Remove technical prefixes like "request body: " for user-friendly messages
            return err.replace(/^request body:\s*/, '').replace(/^categories:\s*/, 'Kategorien: ');
          }
          return err.message || err.toString();
        })
        .join(', ');
      return `${validationErrors}`;
    }
  }
  
  // If all else fails, return the fallback message
  return fallbackMessage;
}

/**
 * Create a user-friendly error message from an API response.
 * 
 * @param response - The fetch response object
 * @param responseData - The parsed JSON response data
 * @returns A promise resolving to a readable error message
 */
export async function createApiErrorMessage(
  response: Response, 
  responseData?: any
): Promise<string> {
  // If we have response data, try to extract error from it
  if (responseData) {
    const message = extractErrorMessage(responseData.error || responseData);
    if (message !== 'Ein unbekannter Fehler ist aufgetreten') {
      return message;
    }
  }
  
  // Try to parse response as JSON if not already done
  if (!responseData) {
    try {
      const data = await response.json();
      const message = extractErrorMessage(data.error || data);
      if (message !== 'Ein unbekannter Fehler ist aufgetreten') {
        return message;
      }
    } catch {
      // JSON parsing failed, continue to fallback
    }
  }
  
  // Use status-specific fallback messages
  switch (response.status) {
    case 400:
      return 'Ungültige Anfrage - bitte überprüfe deine Eingaben';
    case 401:
      return 'Nicht autorisiert - bitte melde dich an';
    case 403:
      return 'Zugriff verweigert';
    case 404:
      return 'Seite oder Ressource nicht gefunden';
    case 429:
      return 'Zu viele Anfragen - bitte versuche es später erneut';
    case 500:
      return 'Serverfehler - bitte versuche es später erneut';
    case 502:
      return 'Server nicht erreichbar';
    case 503:
      return 'Dienst vorübergehend nicht verfügbar';
    default:
      return `Serverfehler (${response.status})`;
  }
}