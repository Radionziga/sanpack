/**
 * Utility to replace spaces after short Russian prepositions/conjunctions
 * with non-breaking spaces (\u00A0) to eliminate hanging prepositions ("висячие предлоги").
 */

export function fixPrepositions(text: string | null | undefined): string {
  if (!text) return '';
  
  // Replace space after short prepositions/conjunctions with non-breaking space (\u00A0)
  return text.replace(
    /(^|[\s\(\«"“'])(в|во|на|с|со|и|к|ко|по|для|от|из|до|без|за|под|подо|над|о|об|обо|при|про|через|не|ни|а|но|или|из-за|из-под|va|uchun|bilan|ham|yoki)\s+/gi,
    '$1$2\u00A0'
  );
}
