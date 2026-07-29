import re

with open('lib/seedData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Exact mapping dict based on PDF x,y coordinates
mapping = {
    'prod-tb-20l': '/catalog/extracted_p4_img1.jpeg',
    'prod-tb-22l': '/catalog/extracted_p4_img2.jpeg',
    'prod-tb-41l': '/catalog/extracted_p4_img3.jpeg',
    'prod-tb-85l': '/catalog/extracted_p4_img6.jpeg',
    'prod-tb-160l': '/catalog/extracted_p4_img8.jpeg',
    'prod-tb-220l': '/catalog/extracted_p4_img9.jpeg',
    'prod-tb-240l-6': '/catalog/extracted_p4_img7.jpeg',
    'prod-tb-240l-11': '/catalog/extracted_p4_img10.jpeg',

    'prod-foil-alu': '/catalog/extracted_p5_img6.jpeg',
    'prod-stretch-film': '/catalog/extracted_p5_img7.jpeg',
    'prod-parchment-paper': '/catalog/extracted_p5_img8.jpeg',
    'prod-vacuum-film': '/catalog/extracted_p5_img9.jpeg',
    'prod-poly-gloves': '/catalog/extracted_p5_img3.jpeg',
    'prod-nitrile-gloves': '/catalog/extracted_p5_img1.jpeg',
    'prod-rubber-gloves': '/catalog/extracted_p5_img2.jpeg',

    'prod-tshirt-3kg': '/catalog/extracted_p6_img10.jpeg',
    'prod-tshirt-5kg': '/catalog/extracted_p6_img4.jpeg',
    'prod-tshirt-10kg': '/catalog/extracted_p6_img2.jpeg',
    'prod-tshirt-25kg': '/catalog/extracted_p6_img6.jpeg',
    'prod-tshirt-50kg': '/catalog/extracted_p6_img12.jpeg',
    'prod-tshirt-branded': '/catalog/extracted_p6_img18.jpeg',
    'prod-roll-bags-small': '/catalog/extracted_p6_img14.jpeg',
    'prod-roll-bags-large': '/catalog/extracted_p6_img16.jpeg',
    'prod-pizza-boxes': '/catalog/extracted_p6_img17.jpeg',

    'prod-rice-lazer': '/catalog/extracted_p7_img1.jpeg',
    'prod-rice-alanga': '/catalog/extracted_p7_img2.jpeg',
    'prod-buckwheat': '/catalog/extracted_p7_img6.jpeg',
    'prod-lentils-red': '/catalog/extracted_p7_img7.jpeg',
    'prod-chickpeas-iran': '/catalog/extracted_p7_img5.jpeg',
    'prod-chickpeas-usa': '/catalog/extracted_p7_img3.jpeg',
    'prod-flour-dani-nan': '/catalog/extracted_p7_img9.jpeg',
    'prod-flour-motabar': '/catalog/extracted_p7_img8.jpeg',
    'prod-flour-altyn-dan': '/catalog/extracted_p7_img10.jpeg',

    'prod-sugar-ru': '/catalog/extracted_p8_img1.jpeg',
    'prod-sunflower-oil-oleyna': '/catalog/extracted_p8_img2.jpeg',
    'prod-chicken-meat': '/catalog/extracted_p8_img3.jpeg',
    'prod-beef-meat': '/catalog/extracted_p8_img4.jpeg',
    'prod-fresh-fruits': '/catalog/extracted_p8_img5.jpeg',
    'prod-seafood-asifood': '/catalog/extracted_p8_img6.jpeg',

    'prod-cheese-svalya': '/catalog/extracted_p9_img7.jpeg',
    'prod-cheese-viola': '/catalog/extracted_p9_img5.jpeg',
    'prod-cheese-valio-burger': '/catalog/extracted_p9_img6.jpeg',
    'prod-cheese-valio-standard': '/catalog/extracted_p9_img8.jpeg',
    'prod-cheese-fitaki': '/catalog/extracted_p9_img3.jpeg',

    'prod-green-spinach': '/catalog/extracted_p11_img6.jpeg',
    'prod-green-iceberg': '/catalog/extracted_p11_img2.jpeg',
    'prod-green-rucola': '/catalog/extracted_p11_img1.jpeg',
    'prod-green-mangold': '/catalog/extracted_p11_img3.jpeg',
}

count = 0
for prod_id, img_path in mapping.items():
    pattern = rf'("id":\s*"{prod_id}"[\s\S]*?"images":\s*\[\s*")([^"]+)("[\s\S]*?"mainImage":\s*")([^"]+)(")'
    def repl(m):
        global count
        count += 1
        return f'{m.group(1)}{img_path}{m.group(3)}{img_path}{m.group(5)}'
    content = re.sub(pattern, repl, content)

with open('lib/seedData.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Successfully updated {count} product images in lib/seedData.ts!')
