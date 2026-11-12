import { NavLink } from "react-router";

const LINKS = [
  { to: "/dashboard", label: "Profilaktyka", end: true },
  { to: "/dashboard/leki", label: "Leki", end: false },
  { to: "/dashboard/sor", label: "Kolejki na SOR", end: false },
  { to: "/dashboard/ustawienia", label: "Ustawienia", end: false },
];

function linkClassName({ isActive }: { isActive: boolean }): string {
  const base =
    "flex min-h-11 items-center rounded-field px-3 py-2 text-sm font-medium";
  return isActive
    ? `${base} bg-brand-50 text-brand-700`
    : `${base} text-slate-600 hover:bg-slate-100`;
}

export function DashboardSidebar() {
  return (
    <nav aria-label="Sekcje dashboardu">
      <ul className="flex gap-2 sm:flex-col">
        {LINKS.map((link) => (
          <li key={link.to} className="flex-1">
            <NavLink to={link.to} end={link.end} className={linkClassName}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
