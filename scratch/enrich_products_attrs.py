import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('lib/seedData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's write a helper function to construct attributes map for a product
def get_attributes_for_product(prod_id, cat_id, title):
    attrs = {}
    
    # Trash bags
    if 'prod-tb-' in prod_id:
        attrs['material'] = 'ПНД'
        attrs['thickness'] = '15 мкм' if '20l' in prod_id or '22l' in prod_id else ('20 мкм' if '41l' in prod_id or '85l' in prod_id else '30 мкм')
        if '20l' in prod_id: attrs['volume'] = '20 л'
        elif '22l' in prod_id: attrs['volume'] = '22 л'
        elif '41l' in prod_id: attrs['volume'] = '41 л'
        elif '85l' in prod_id: attrs['volume'] = '85 л'
        elif '160l' in prod_id: attrs['volume'] = '160 л'
        elif '220l' in prod_id: attrs['volume'] = '220 л'
        elif '240l' in prod_id: attrs['volume'] = '240 л'
        attrs['packaging_type'] = 'Рулон'
        attrs['horeca_category'] = 'Мусорные мешки'

    # Foil & Film
    elif cat_id == 'cat-film-foil':
        if 'foil' in prod_id:
            attrs['material'] = 'Алюминий'
            attrs['thickness'] = '11 мкм'
            attrs['packaging_type'] = 'Рулон'
        elif 'stretch' in prod_id:
            attrs['material'] = 'ПВХ / Стрейч'
            attrs['thickness'] = '8 мкм'
            attrs['packaging_type'] = 'Рулон'
        elif 'parchment' in prod_id:
            attrs['material'] = 'Пергамент'
            attrs['thickness'] = '40 мкм'
            attrs['packaging_type'] = 'Рулон'
        elif 'vacuum' in prod_id:
            attrs['material'] = 'Полиэтилен'
            attrs['thickness'] = '20 мкм'
            attrs['packaging_type'] = 'Вакуумная упаковка'
        attrs['horeca_category'] = 'Плёнка и Фольга'

    # Gloves
    elif cat_id == 'cat-gloves':
        if 'nitrile' in prod_id:
            attrs['material'] = 'Нитрил'
        elif 'rubber' in prod_id:
            attrs['material'] = 'Резина'
        else:
            attrs['material'] = 'Полиэтилен'
        attrs['packaging_type'] = 'Пачка'
        attrs['horeca_category'] = 'Перчатки и Защита'

    # T-Shirt bags & Roll bags
    elif cat_id == 'cat-tshirt-bags':
        attrs['material'] = 'ПНД'
        if 'tshirt-3' in prod_id: attrs['thickness'] = '10 мкм'
        elif 'tshirt-5' in prod_id: attrs['thickness'] = '12 мкм'
        elif 'tshirt-10' in prod_id: attrs['thickness'] = '15 мкм'
        elif 'tshirt-25' in prod_id: attrs['thickness'] = '20 мкм'
        elif 'tshirt-50' in prod_id: attrs['thickness'] = '25 мкм'
        elif 'roll' in prod_id: attrs['thickness'] = '8 мкм'; attrs['packaging_type'] = 'Рулон'
        elif 'pizza' in prod_id: attrs['thickness'] = '20 мкм'; attrs['packaging_type'] = 'Пачка'
        attrs['horeca_category'] = 'Пакеты Майка'

    # Groceries
    elif cat_id == 'cat-groceries':
        attrs['horeca_category'] = 'Бакалея и Мука'
        if 'rice' in prod_id or 'grechka' in prod_id:
            attrs['weight'] = '1 кг'
            attrs['packaging_type'] = 'Пачка'
        elif 'flour-motabar' in prod_id or 'flour-altyn' in prod_id:
            attrs['weight'] = '50 кг'
            attrs['packaging_type'] = 'Мешок 50 кг'
        elif 'flour-dani' in prod_id:
            attrs['weight'] = '5 кг'
            attrs['packaging_type'] = 'Пачка'
        elif 'oil' in prod_id:
            attrs['weight'] = '1 кг'
            attrs['packaging_type'] = 'Бутылка 1 л'

    # Cheeses & Butter
    elif cat_id == 'cat-cheeses':
        attrs['horeca_category'] = 'Сыры и Масло'
        if 'svalia' in prod_id: attrs['weight'] = '3 кг'; attrs['packaging_type'] = 'Брус'
        elif 'viola' in prod_id: attrs['weight'] = '400 гр'; attrs['packaging_type'] = 'Контейнер / Лоток'
        elif 'valio-burger' in prod_id: attrs['weight'] = '150 гр'; attrs['packaging_type'] = 'Пачка'
        elif 'fitaki' in prod_id: attrs['weight'] = '500 гр'; attrs['packaging_type'] = 'Контейнер / Лоток'
        elif 'dorblu' in prod_id: attrs['weight'] = '2.5 кг'; attrs['packaging_type'] = 'Брус'
        elif 'butter' in prod_id: attrs['weight'] = '500 гр'; attrs['packaging_type'] = 'Пачка'

    # Greens Novagreen
    elif cat_id == 'cat-greens':
        attrs['horeca_category'] = 'Свежая зелень Novagreen'
        if 'mint' in prod_id: attrs['weight'] = '60 гр'; attrs['packaging_type'] = 'Контейнер / Лоток'
        elif 'iceberg' in prod_id: attrs['weight'] = '500 гр'; attrs['packaging_type'] = 'Контейнер / Лоток'
        elif 'rukola' in prod_id: attrs['weight'] = '250 гр'; attrs['packaging_type'] = 'Контейнер / Лоток'
        elif 'rosemary' in prod_id: attrs['weight'] = '20 гр'; attrs['packaging_type'] = 'Контейнер / Лоток'
        elif 'microgreen' in prod_id: attrs['weight'] = '60 гр'; attrs['packaging_type'] = 'Контейнер / Лоток'

    # Branding
    elif cat_id == 'cat-branding':
        attrs['horeca_category'] = 'Брендирование Nova Print'

    return attrs

# Match products and update their attributes map in seedData.ts
def update_product_attributes_in_code():
    global content
    
    # Parse product blocks
    prod_matches = re.finditer(r'\{\s*"id": "(prod-[^"]+)",[\s\S]*?"categoryId": "([^"]+)",[\s\S]*?"titleRu": "([^"]+)",[\s\S]*?"attributes": \{([\s\S]*?)\},', content)
    
    replacements = []
    for m in prod_matches:
        prod_id = m.group(1)
        cat_id = m.group(2)
        title = m.group(3)
        old_attrs_raw = m.group(4)
        
        computed = get_attributes_for_product(prod_id, cat_id, title)
        
        # Build JS object lines for attributes
        lines = []
        for k, v in computed.items():
            lines.append(f'      "{k}": "{v}"')
        
        new_attrs_block = ',\n'.join(lines)
        full_match = m.group(0)
        
        # Replace attributes segment inside full match
        replaced_match = re.sub(r'"attributes": \{[\s\S]*?\},', f'"attributes": {{\n{new_attrs_block}\n    }},', full_match)
        replacements.append((full_match, replaced_match))

    for old_s, new_s in replacements:
        content = content.replace(old_s, new_s)

    with open('lib/seedData.ts', 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'Successfully updated attributes for {len(replacements)} products!')

update_product_attributes_in_code()
