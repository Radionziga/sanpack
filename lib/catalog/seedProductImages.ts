const sharedImage = (path: string, codes: string[]) =>
  Object.fromEntries(codes.map((code) => [`SP-${code}`, path]));

const seedProductImages: Record<string, string> = {
  // SANPACK packaging. These mappings mirror the reviewed catalogue assets.
  'SP-TB-001': '/catalog/sanpack_trash_bag_roll_6_nobg.png',
  'SP-TB-002': '/catalog/sanpack_trash_bag_roll_3_nobg.png',
  'SP-TB-003': '/catalog/sanpack_trash_bag_roll_4_nobg.png',
  'SP-TB-004': '/catalog/sanpack_trash_bag_roll_1_nobg.png',
  'SP-TB-005': '/catalog/sanpack_trash_bag_roll_1_nobg.png',
  'SP-TB-006': '/catalog/commercial_packaging_3.webp',
  'SP-TB-007': '/catalog/sanpack_trash_bag_roll_2_nobg.png',
  'SP-TB-008': '/catalog/sanpack_trash_bag_roll_5_nobg.png',
  'SP-TO-001': '/catalog/commercial_packaging_4.webp',
  'SP-TO-002': '/catalog/commercial_packaging_5.webp',
  'SP-CB-001': '/catalog/commercial_packaging_9.webp',
  'SP-CB-002': '/catalog/commercial_packaging_10.webp',
  'SP-CB-003': '/catalog/commercial_packaging_8.webp',
  'SP-CB-004': '/catalog/commercial_packaging_6.webp',
  'SP-CB-005': '/catalog/commercial_packaging_7.webp',
  ...sharedImage('/catalog/extracted_p5_img9.jpeg', ['VB-001', 'VB-002', 'VB-003']),
  'SP-FP-001': '/catalog/extracted_p5_img7.jpeg',
  'SP-FP-002': '/catalog/extracted_p5_img7.jpeg',
  'SP-FP-003': '/catalog/extracted_p5_img6.jpeg',
  'SP-FP-004': '/catalog/extracted_p5_img8.jpeg',
  'SP-GL-001': '/catalog/extracted_p5_img3.jpeg',
  'SP-GL-002': '/catalog/extracted_p5_img2.jpeg',
  'SP-GL-003': '/catalog/extracted_p5_img2.jpeg',
  'SP-GL-004': '/catalog/extracted_p5_img1.jpeg',

  // The project already approved one shared group photo for each meat group.
  ...sharedImage('/catalog/extracted_p8_img4.jpeg', [
    'BF-001', 'BF-002', 'BF-003', 'BF-004', 'BF-005', 'BF-006',
    'BF-007', 'BF-008', 'BF-009', 'BF-010', 'BF-011', 'BF-012',
  ]),
  ...sharedImage('/catalog/extracted_p8_img3.jpeg', [
    'CH-001', 'CH-002', 'CH-003', 'CH-004', 'CH-005',
    'CH-006', 'CH-007', 'CH-008', 'CH-009',
  ]),
  'SP-EG-001': '/catalog/categories/eggs.png',

  // Grocery images extracted from the reviewed SANPACK catalogue.
  ...sharedImage('/catalog/extracted_p7_img9.jpeg', ['FL-001', 'FL-002', 'FL-003', 'FL-004']),
  ...sharedImage('/catalog/extracted_p7_img10.jpeg', ['FL-005', 'FL-006']),
  ...sharedImage('/catalog/extracted_p7_img8.jpeg', ['FL-007', 'FL-008']),
  'SP-SG-001': '/catalog/extracted_p8_img1.jpeg',
  'SP-GR-001': '/catalog/extracted_p7_img1.jpeg',
  'SP-GR-002': '/catalog/extracted_p7_img2.jpeg',
  'SP-GR-003': '/catalog/extracted_p7_img6.jpeg',
  'SP-GR-004': '/catalog/extracted_p7_img7.jpeg',
  'SP-GR-005': '/catalog/extracted_p7_img3.jpeg',
  'SP-GR-006': '/catalog/extracted_p7_img5.jpeg',
  'SP-OI-001': '/catalog/extracted_p8_img2.jpeg',
  ...sharedImage('/catalog/extracted_p8_img5.jpeg', [
    'FR-001', 'FR-002', 'FR-003', 'FR-004', 'FR-005', 'FR-006',
    'FR-007', 'FR-008', 'FR-009', 'FR-010', 'FR-011', 'FR-012',
    'FR-013', 'FR-014', 'FR-015', 'FR-016', 'FR-017', 'FR-018',
    'FR-019', 'FR-020', 'FR-021', 'FR-022',
  ]),

  // Novagreen catalogue photography. Some products intentionally share a photo.
  'SP-GN-001': '/catalog/extracted_p11_img2.jpeg',
  'SP-GN-002': '/catalog/extracted_p11_img4.jpeg',
  'SP-GN-003': '/catalog/extracted_p11_img5.jpeg',
  'SP-GN-004': '/catalog/extracted_p11_img1.jpeg',
  'SP-GN-006': '/catalog/extracted_p11_img6.jpeg',
  'SP-GN-008': '/catalog/extracted_p11_img7.jpeg',
  'SP-GN-009': '/catalog/extracted_p11_img8.jpeg',
  'SP-GN-010': '/catalog/extracted_p11_img3.jpeg',
  'SP-GN-013': '/catalog/extracted_p12_img1.jpeg',
  'SP-GN-016': '/catalog/extracted_p12_img6.jpeg',
  'SP-GN-018': '/catalog/extracted_p12_img9.jpeg',
  'SP-GN-020': '/catalog/extracted_p12_img7.jpeg',
  'SP-GN-022': '/catalog/extracted_p12_img5.jpeg',
  'SP-GN-024': '/catalog/extracted_p12_img5.jpeg',
  'SP-GN-026': '/catalog/extracted_p12_img8.jpeg',

  // Dairy products shared with the previous reviewed catalogue edition.
  'SP-DA-001': '/catalog/extracted_p10_img5.jpeg',
  'SP-DA-002': '/catalog/extracted_p10_img4.jpeg',
  'SP-DA-003': '/catalog/extracted_p10_img3.jpeg',
  'SP-DA-006': '/catalog/extracted_p9_img6.jpeg',
  'SP-DA-007': '/catalog/extracted_p9_img8.jpeg',
  'SP-DA-008': '/catalog/extracted_p9_img5.jpeg',
  'SP-DA-009': '/catalog/extracted_p9_img3.jpeg',
  'SP-DA-010': '/catalog/extracted_p9_img2.jpeg',
  'SP-DA-013': '/catalog/extracted_p9_img7.jpeg',
};

export function getSeedProductImage(sku: string) {
  return seedProductImages[sku];
}
