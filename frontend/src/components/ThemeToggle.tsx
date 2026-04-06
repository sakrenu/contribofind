"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 w-full"
      aria-label="Toggle dark mode"
    >
      <span>{isDark ? "☀️" : "🌙"}</span>
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
