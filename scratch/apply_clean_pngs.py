import re

with open('lib/seedData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Clean PNGs extracted directly from user's folder C:\Users\Радион\Desktop\Sanpack Фото
clean_png_map = {
    # Trash Bags (Мешки для мусора)
    'prod-tb-20l': '/catalog/sanpack_trash_bag_roll_1_nobg.png',
    'prod-tb-22l': '/catalog/sanpack_trash_bag_roll_2_nobg.png',
    'prod-tb-41l': '/catalog/sanpack_trash_bag_roll_3_nobg.png',
    'prod-tb-85l': '/catalog/sanpack_trash_bag_roll_4_nobg.png',
    'prod-tb-160l': '/catalog/sanpack_trash_bag_roll_5_nobg.png',
    'prod-tb-220l': '/catalog/sanpack_trash_bag_roll_6_nobg.png',
    'prod-tb-240l-6': '/catalog/sanpack_trash_bag_roll_10.png',
    'prod-tb-240l-11': '/catalog/commercial_packaging_11_nobg.png',

    # T-Shirt Bags & Roll Bags & Pizza Packaging
    'prod-tshirt-3kg': '/catalog/commercial_packaging_10.png',
    'prod-tshirt-5kg': '/catalog/commercial_packaging_3.png',
    'prod-tshirt-10kg': '/catalog/commercial_packaging_4.png',
    'prod-tshirt-25kg': '/catalog/commercial_packaging_5.png',
    'prod-tshirt-50kg': '/catalog/commercial_packaging_6.png',
    'prod-tshirt-branded': '/catalog/commercial_packaging_7.png',
    'prod-roll-bags-small': '/catalog/commercial_packaging_8.png', # 222 DONA
    'prod-roll-bags-large': '/catalog/commercial_packaging_9.png', # 303 DONA
    'prod-pizza-boxes': '/catalog/commercial_packaging_12_nobg.png',

    # Consumables
    'prod-foil-alu': '/catalog/extracted_p5_img6.jpeg',
    'prod-stretch-film': '/catalog/extracted_p5_img7.jpeg',
    'prod-parchment-paper': '/catalog/extracted_p5_img8.jpeg',
    'prod-vacuum-film': '/catalog/extracted_p5_img9.jpeg',
    'prod-poly-gloves': '/catalog/extracted_p5_img3.jpeg',
    'prod-nitrile-gloves': '/catalog/extracted_p5_img1.jpeg',
    'prod-rubber-gloves': '/catalog/extracted_p5_img2.jpeg',
}

count = 0
for prod_id, img_path in clean_png_map.items():
    pattern = rf'("id":\s*"{prod_id}"[\s\S]*?"images":\s*\[\s*")([^"]+)("[\s\S]*?"mainImage":\s*")([^"]+)(")'
    def repl(m):
        global count
        count += 1
        return f'{m.group(1)}{img_path}{m.group(3)}{img_path}{m.group(5)}'
    content = re.sub(pattern, repl, content)

with open('lib/seedData.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Successfully updated {count} product images with studio clean transparent PNGs!')
