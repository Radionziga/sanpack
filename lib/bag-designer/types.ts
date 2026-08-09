export type BagType = 'tshirt' | 'die-cut' | 'flat';

export interface BagSizePreset {
  id: string;
  bagType: BagType;
  label: string;
  width: number;
  height: number;
  gusset: number;
}

export interface BagColorPreset {
  id: string;
  label: string;
  value: string;
}

export interface BagDesignerSettings {
  enabled: boolean;
  minimumQuantity: number;
  sizePresets: BagSizePreset[];
  colors: BagColorPreset[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface BagDesignSpec {
  bagType: BagType;
  width: number;
  height: number;
  gusset: number;
  color: string;
  colorLabel: string;
  finish: 'matte' | 'glossy';
  quantity: number;
  logoX: number;
  logoY: number;
  logoScale: number;
  logoRotation: number;
}

export interface BagDesignContact {
  name: string;
  phone: string;
}

export interface BagDesignRequestRecord {
  id: string;
  number: string;
  status: 'draft' | 'new' | 'in_progress' | 'completed' | 'cancelled';
  contact: BagDesignContact;
  spec: BagDesignSpec;
  logoName: string;
  logoUrl: string;
  technicalPreviewUrl: string;
  aiMockupUrl: string;
  createdAt: string;
  submittedAt?: string;
}
