import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('lib/seedData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

products = re.findall(r'"id": "(prod-[^"]+)"[\s\S]*?"categoryId": "([^"]+)"[\s\S]*?"titleRu": "([^"]+)"', content)

print(f'Found {len(products)} products:')
for p in products:
    print(f"{p[0]} | {p[1]} | {p[2]}")
