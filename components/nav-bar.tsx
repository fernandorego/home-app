"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) return null;

  const links = [
    { href: "/expenses", label: "Expenses" },
    { href: "/tasks", label: "To-Do" },
    { href: "/shopping", label: "Shopping" },
  ];

  const displayName =
    session.user.name?.trim() ||
    session.user.email?.split("@")[0] ||
    "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="navbar bg-base-200 border-b border-base-300">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl">
          home
        </Link>
        <ul className="menu menu-horizontal px-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={pathname.startsWith(l.href) ? "active" : ""}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-none">
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost flex items-center gap-2 normal-case"
          >
            <div className="avatar">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center overflow-hidden">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center font-semibold">
                    {initial}
                  </span>
                )}
              </div>
            </div>
            <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box z-10 mt-2 w-52 p-2 shadow-lg"
          >
            <li className="menu-title">
              <span className="truncate">{displayName}</span>
            </li>
            <li>
              <Link
                href="/admin"
                className={pathname.startsWith("/admin") ? "active" : ""}
              >
                Administration
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/signin" })}
              >
                Sign out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
