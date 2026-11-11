'use client';

import * as React from 'react';
import { FIELD, type AddressErrors, type AddressForm } from '@/lib/checkout-form';
import { cn } from '@/lib/cn';

const LABEL = 'text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70';

interface Props {
  idPrefix: string;
  value: AddressForm;
  errors: AddressErrors;
  showErrors: boolean;
  onChange: (next: AddressForm) => void;
  /** Autocomplete section, e.g. "shipping" or "billing". */
  section: 'shipping' | 'billing';
}

/** UK address block: name, company, two address lines, town, county, postcode. Country is fixed to the UK. */
export function AddressFields({ idPrefix, value, errors, showErrors, onChange, section }: Props) {
  const set = (key: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [key]: e.target.value });
  const field = (key: keyof AddressForm, label: string, opts: { autoComplete: string; required?: boolean; className?: string; inputMode?: 'text' | 'numeric'; placeholder?: string }) => {
    const id = `${idPrefix}-${key}`;
    const err = showErrors ? errors[key] : undefined;
    return (
      <div className={opts.className}>
        <label htmlFor={id} className={LABEL}>
          {label}
          {!opts.required && <span className="ml-1 font-normal normal-case tracking-normal text-charcoal/50">(optional)</span>}
        </label>
        <input
          id={id}
          name={id}
          value={value[key]}
          onChange={set(key)}
          autoComplete={`${section} ${opts.autoComplete}`}
          required={opts.required}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id}-error` : undefined}
          inputMode={opts.inputMode}
          placeholder={opts.placeholder}
          className={cn(FIELD, 'mt-1.5')}
        />
        {err && (
          <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red">
            {err}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field('first_name', 'First name', { autoComplete: 'given-name', required: true })}
      {field('last_name', 'Last name', { autoComplete: 'family-name', required: true })}
      {field('company', 'Company', { autoComplete: 'organization', className: 'sm:col-span-2' })}
      {field('address_1', 'Address line 1', { autoComplete: 'address-line1', required: true, className: 'sm:col-span-2', placeholder: 'House number and street' })}
      {field('address_2', 'Address line 2', { autoComplete: 'address-line2', className: 'sm:col-span-2', placeholder: 'Flat, suite, building' })}
      {field('city', 'Town / city', { autoComplete: 'address-level2', required: true })}
      {field('state', 'County', { autoComplete: 'address-level1' })}
      {field('postcode', 'Postcode', { autoComplete: 'postal-code', required: true, placeholder: 'e.g. UB6 8RF' })}
      <div>
        <span className={LABEL}>Country</span>
        <div className={cn(FIELD, 'mt-1.5 flex items-center bg-[#f5f5f5] text-charcoal/80')} aria-readonly="true">
          United Kingdom
        </div>
      </div>
    </div>
  );
}
