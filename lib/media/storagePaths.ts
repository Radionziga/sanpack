/** CMS uploads are public assets; customer attachments are never in this namespace. */
export function isPublicMediaPath(path: string): boolean {
  return path.startsWith('media/') && !path.includes('\\')
    && path.split('/').every((part) => part && part !== '.' && part !== '..');
}

export function isPrivateBagAssetPath(path: string): boolean {
  return /^bag-design-requests\/[a-zA-Z0-9_-]{8,100}\/(?:logo|technical-preview|ai-mockup)\.(?:png|jpeg|jpg|webp)$/.test(path);
}
