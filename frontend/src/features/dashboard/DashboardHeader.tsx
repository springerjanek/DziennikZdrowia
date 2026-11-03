import type { AuthUser } from "@/auth/types";

type Props = {
  user: AuthUser;
};

// Wylogowanie siedzi w Ustawieniach - w prawym gornym rogu ma byc miejsce na
// dzwonek i skrzynke powiadomien.
export function DashboardHeader({ user }: Props) {
  return (
    <header className="flex items-center gap-3">
      {user.pictureUrl !== null && (
        <img
          src={user.pictureUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{user.name}</p>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
      </div>
    </header>
  );
}
