import type { ReactNode } from "react";

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-field border border-slate-300 bg-white py-2.5 pr-9 pl-3 text-slate-900"
        >
          {children}
        </select>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-slate-500"
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </div>
    </div>
  );
}
