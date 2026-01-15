/**
 * Decodes XML data from base64 if needed.
 * Returns the XML string as-is if it already starts with '<'.
 */
export function decodeXmlData(data: string): string {
  if (!data) return '';

  // If it already starts with '<', it's raw XML
  if (data.startsWith('<')) {
    return data;
  }

  // Try to decode as base64
  try {
    return new TextDecoder().decode(
      Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    );
  } catch {
    // Return as-is if decoding fails
    return data;
  }
}
