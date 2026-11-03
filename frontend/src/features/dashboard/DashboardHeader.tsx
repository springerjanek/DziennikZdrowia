import { useNavigate } from "react-router";
import { signOut } from "@/auth/session";
import type { AuthUser } from "@/auth/types";

type Props = {
  user: AuthUser;
};

export function DashboardHeader({ user }: Props) {
  const navigate = useNavigate();

  function handleSignOut() {
    signOut()
      .catch(() => undefined)
      .then(() => navigate("/konto", { replace: true }));
  }

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
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-field border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
      >
        Wyloguj
      </button>
    </header>
  );
}
