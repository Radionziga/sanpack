import type { BagDesignerSettings, BagType } from './types';

export const BAG_TYPE_LABELS: Record<BagType, string> = {
  tshirt: 'Пакет «майка»',
  'die-cut': 'Пакет с вырубной ручкой',
  flat: 'Прямоугольный пакет',
};

export const defaultBagDesignerSettings: BagDesignerSettings = {
  enabled: true,
  minimumQuantity: 1_000,
  sizePresets: [
    { id: 'tshirt-30-50', bagType: 'tshirt', label: '30 × 50 см', width: 30, height: 50, gusset: 8 },
    { id: 'tshirt-35-60', bagType: 'tshirt', label: '35 × 60 см', width: 35, height: 60, gusset: 10 },
    { id: 'tshirt-40-70', bagType: 'tshirt', label: '40 × 70 см', width: 40, height: 70, gusset: 12 },
    { id: 'die-30-40', bagType: 'die-cut', label: '30 × 40 см', width: 30, height: 40, gusset: 0 },
    { id: 'die-40-50', bagType: 'die-cut', label: '40 × 50 см', width: 40, height: 50, gusset: 0 },
    { id: 'die-50-60', bagType: 'die-cut', label: '50 × 60 см', width: 50, height: 60, gusset: 0 },
    { id: 'flat-20-30', bagType: 'flat', label: '20 × 30 см', width: 20, height: 30, gusset: 0 },
    { id: 'flat-30-40', bagType: 'flat', label: '30 × 40 см', width: 30, height: 40, gusset: 0 },
    { id: 'flat-40-50', bagType: 'flat', label: '40 × 50 см', width: 40, height: 50, gusset: 0 },
  ],
  colors: [
    { id: 'sanpack-green', label: 'Фирменный зелёный', value: '#0F6E43' },
    { id: 'white', label: 'Белый', value: '#F7F7F2' },
    { id: 'black', label: 'Чёрный', value: '#161A18' },
    { id: 'kraft', label: 'Крафтовый', value: '#B7895E' },
    { id: 'transparent', label: 'Полупрозрачный', value: '#DDE6E0' },
  ],
};
