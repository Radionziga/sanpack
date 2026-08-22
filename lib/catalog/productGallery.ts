import { hasProductImage } from '@/lib/catalog/productImages';

export function getProductGalleryImages(
  productImages: Array<string | null | undefined>,
  selectedVariantImage?: string | null,
): string[] {
  return [selectedVariantImage, ...productImages]
    .filter(hasProductImage)
    .filter((image, index, images) => images.indexOf(image) === index);
}
