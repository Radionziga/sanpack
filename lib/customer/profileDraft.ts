export const CUSTOMER_PROFILE_STORAGE_KEY = 'sanpack_customer_profile_v1';

export interface CustomerProfileDraft {
  name: string;
  phone: string;
  company?: string;
  address?: string;
  inn?: string;
}

export function readCustomerProfileDraft(): CustomerProfileDraft | null {
  try {
    const stored = window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<CustomerProfileDraft>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      company: typeof parsed.company === 'string' ? parsed.company : '',
      address: typeof parsed.address === 'string' ? parsed.address : '',
      inn: typeof parsed.inn === 'string' ? parsed.inn : '',
    };
  } catch {
    return null;
  }
}

export function writeCustomerProfileDraft(profile: CustomerProfileDraft) {
  window.localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}
