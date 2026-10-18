type ChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
};

export function Chip({ label, selected, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${
        selected
          ? "border-brand-600 bg-brand-50 text-brand-700"
          : "border-slate-300 text-slate-700 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );
}
