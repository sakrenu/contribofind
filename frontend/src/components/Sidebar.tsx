"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

type Props = {
  active?: string;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Find Issues", icon: "🔍", key: "dashboard" },
  { href: "/saved", label: "Saved Issues", icon: "📌", key: "saved" },
  { href: "/learn", label: "Learn OSS", icon: "📖", key: "learn" },
];

export default function Sidebar({ active }: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const username = session?.user?.name || "developer";
  const avatar = session?.user?.image || "";

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10">
        <Link href="/dashboard" className="font-semibold text-sm">
          ContriboFind
        </Link>
        <nav className="flex items-center gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                (active || pathname) === item.href || active === item.key
                  ? "bg-violet-50 dark:bg-violet-950 text-primary font-medium"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {item.icon}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 flex-col border-r border-border dark:border-zinc-800 bg-white dark:bg-zinc-950 z-10">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border dark:border-zinc-800">
          <Link href="/dashboard" className="font-semibold text-zinc-900 dark:text-white tracking-tight">
            ContriboFind
          </Link>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-border dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {avatar && (
              <Image
                src={avatar}
                alt={username}
                width={36}
                height={36}
                className="rounded-full"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                {username}
              </p>
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 hover:text-primary transition-colors truncate block"
              >
                github.com/{username}
              </a>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key || pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-violet-50 dark:bg-violet-950 text-primary font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-surface dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-border dark:border-zinc-800 space-y-2">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left text-xs text-zinc-400 hover:text-red-500 transition-colors px-3 py-2"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
