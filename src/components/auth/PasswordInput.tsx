/**
 * PasswordInput — password field with a show/hide eye toggle.
 *
 * Wraps the brand .fl-input so it stays visually identical to every other
 * field; the toggle sits inside the trailing edge (logical `end`, so it flips
 * correctly in the Arabic RTL layout).
 *
 * The button is type="button" — inside a form a bare <button> defaults to
 * type="submit", which would submit the form on every toggle. It's excluded
 * from the tab order (tabIndex={-1}) so tabbing runs straight from the
 * password field to the submit button, and carries an aria-label plus
 * aria-pressed so screen readers announce the current state.
 */
'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  showLabelText: string;
  hideLabelText: string;
};

export function PasswordInput({
  id,
  value,
  onChange,
  label,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  required = true,
  minLength,
  showLabelText,
  hideLabelText,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="fl-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // Extra end padding so long values never run under the toggle.
          className="fl-input pe-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? hideLabelText : showLabelText}
          aria-pressed={visible}
          title={visible ? hideLabelText : showLabelText}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-md text-ink-muted transition-colors hover:text-teal-ink focus:outline-none focus-visible:text-teal-ink"
        >
          {visible ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
