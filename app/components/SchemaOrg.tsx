'use client';

/**
 * Component to render Schema.org structured data as JSON-LD
 * This helps search engines understand the content and improves SEO
 */
export default function SchemaOrg({ schema }: { schema: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
