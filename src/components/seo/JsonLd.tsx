/**
 * Escapes JSON for an inline <script>: `<`, `>` and `&` become unicode escapes (still the same JSON to a parser), so a
 * WordPress title containing "</script>" cannot close the tag and start markup.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** schema.org structured data block. Works in server and client components. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />;
}
