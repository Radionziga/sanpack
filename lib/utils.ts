import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Replaces spaces after Russian & Uzbek single-letter/short prepositions and conjunctions
 * with non-breaking spaces (\u00a0) to avoid hanging prepositions at line breaks.
 */
export function fixPrepositions(text: string | null | undefined): string {
  if (!text) return '';
  
  const pattern = /(^|[\s\(\«"“'])(в|во|на|из|с|со|по|для|и|к|ко|о|об|обо|у|за|от|до|без|над|под|при|про|не|но|а|из-за|из-под|va|uchun|bilan|ham|yoki)\s+/gi;
  
  return text.replace(pattern, '$1$2\u00a0');
}

