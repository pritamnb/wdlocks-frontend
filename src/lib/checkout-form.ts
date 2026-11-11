import type { CheckoutAddressInput } from '@/types';

/** Form state for one address block. Country is fixed to GB: the shop only ships within the UK. */
export interface AddressForm {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: 'GB';
}

export const EMPTY_ADDRESS: AddressForm = {
  first_name: '',
  last_name: '',
  company: '',
  address_1: '',
  address_2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'GB',
};

/** UK postcode (loose: outward + inward with optional space), e.g. UB6 8RF, SW1A1AA. */
export const UK_POSTCODE = /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type AddressErrors = Partial<Record<keyof AddressForm, string>>;

export function validateAddress(a: AddressForm): AddressErrors {
  const e: AddressErrors = {};
  if (!a.first_name.trim()) e.first_name = 'Enter a first name';
  if (!a.last_name.trim()) e.last_name = 'Enter a last name';
  if (!a.address_1.trim()) e.address_1 = 'Enter the first line of the address';
  if (!a.city.trim()) e.city = 'Enter a town or city';
  if (!a.postcode.trim()) e.postcode = 'Enter a postcode';
  else if (!UK_POSTCODE.test(a.postcode.trim())) e.postcode = 'Enter a valid UK postcode';
  return e;
}

export function isAddressComplete(a: AddressForm): boolean {
  return Object.keys(validateAddress(a)).length === 0;
}

export function normalisePostcode(pc: string): string {
  const compact = pc.toUpperCase().replace(/\s+/g, '');
  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

export function toApiAddress(a: AddressForm, contact?: { email: string; phone: string }): CheckoutAddressInput {
  return {
    first_name: a.first_name.trim(),
    last_name: a.last_name.trim(),
    company: a.company.trim(),
    address_1: a.address_1.trim(),
    address_2: a.address_2.trim(),
    city: a.city.trim(),
    state: a.state.trim(),
    postcode: normalisePostcode(a.postcode.trim()),
    country: 'GB',
    ...(contact ? { email: contact.email.trim(), phone: contact.phone.trim() } : {}),
  };
}

/** Field classes shared by every checkout input (matches the contact forms). */
export const FIELD =
  'block w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[15px] text-near-black placeholder:text-charcoal/45 outline-none transition-[border-color,box-shadow] duration-150 focus:border-near-black focus:ring-2 focus:ring-near-black/10 aria-[invalid=true]:border-red aria-[invalid=true]:focus:ring-red/15';
