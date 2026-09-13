import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRepository } from '@/lib/repositories/adminRepository';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const resources = [
  ['Category', 'getCategories', 'saveCategory', { id: 'c1', parentId: 'g1', slug: 'cat', titleRu: 'Категория', titleUz: 'Kategoriya', status: 'active', sortOrder: 1 }],
  ['Client', 'getClients', 'saveClient', { id: 'cl1', name: 'Партнёр', logo: '/logo.webp', category: 'partner', sortOrder: 1 }],
  ['Attribute', 'getAttributes', 'saveAttribute', { id: 'a1', key: 'brand', titleRu: 'Бренд', titleUz: 'Brend', type: 'select', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 1 }],
  ['Banner', 'getBanners', 'saveBanner', { id: 'b1', titleRu: 'Промо', titleUz: 'Promo', imageDesktop: '/promo.webp', link: '', sortOrder: 1, active: true }],
  ['Product', 'getProducts', 'saveProduct', { id: 'p1', slug: 'item', sku: 'SKU', titleRu: 'Товар', titleUz: 'Mahsulot' }],
] as const;

describe('AdminRepository save → read → edit → save', () => {
  beforeEach(() => fetchMock.mockReset());

  it.each(resources)('%s never echoes server metadata into the mutation DTO', async (_name, getName, saveName, entity) => {
    const readEntity = { ...entity, createdAt: 'old', updatedAt: 'new', createdBy: 'owner', updatedBy: 'editor' };
    fetchMock.mockResolvedValueOnce(Response.json([readEntity]));
    const loaded = (await (AdminRepository[getName] as unknown as () => Promise<Array<Record<string, unknown>>>)())[0];
    fetchMock.mockResolvedValueOnce(Response.json(readEntity));
    await (AdminRepository[saveName] as (value: Record<string, unknown>) => Promise<unknown>)({ ...loaded, titleRu: 'Изменено' });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.id).toBe(entity.id);
    for (const key of ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']) expect(body.data).not.toHaveProperty(key);
  });

  it('round-trips Link Hub settings without leaking server metadata', async () => {
    const linkHub = {
      enabled: true,
      titleRu: 'Все ссылки',
      descriptionRu: 'Описание',
      highlightEnabled: false,
      links: [{ id: 'catalog', labelRu: 'Каталог', href: '/catalog', icon: 'catalog', enabled: true }],
    };
    fetchMock.mockResolvedValueOnce(Response.json({
      company: { name: 'SANPACK' },
      linkHub,
      createdBy: 'private-owner',
      updatedAt: 'private-timestamp',
    }));
    const loaded = await AdminRepository.getSettings();

    fetchMock.mockResolvedValueOnce(Response.json({ ...loaded, linkHub: { ...linkHub, titleRu: 'Новый заголовок' } }));
    await AdminRepository.saveSettings({
      linkHub: { ...loaded.linkHub!, titleRu: 'Новый заголовок' },
    });

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body).toMatchObject({
      action: 'save',
      resource: 'settings',
      id: 'global',
      data: { linkHub: { titleRu: 'Новый заголовок', links: linkHub.links } },
    });
    expect(body.data).not.toHaveProperty('createdBy');
    expect(body.data).not.toHaveProperty('updatedAt');
  });
});
