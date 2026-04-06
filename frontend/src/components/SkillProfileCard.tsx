"use client";

import Image from "next/image";

type Profile = {
  login: string;
  name: string;
  avatar_url: string;
  public_repos: number;
  top_languages: string[];
  account_age_years: number;
  github_url: string;
} | null;

type Props = {
  profile: Profile;
  loading: boolean;
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  JavaScript: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Python: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Go: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  Rust: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Java: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Ruby: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "C++": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "C#": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  Swift: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Kotlin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  PHP: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  Dart: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

function getLangColor(lang: string): string {
  return LANG_COLORS[lang] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export default function SkillProfileCard({ profile, loading }: Props) {
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-24" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full w-20" />
          <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full w-16" />
          <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full w-24" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card">
        <p className="text-sm text-zinc-400">Could not load GitHub profile.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start gap-4">
        {profile.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt={profile.login}
            width={56}
            height={56}
            className="rounded-full shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                {profile.name || profile.login}
              </h3>
              <a
                href={profile.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 hover:text-primary transition-colors font-mono"
              >
                @{profile.login} ↗
              </a>
            </div>
            <div className="flex gap-4 text-xs text-zinc-500 shrink-0">
              <div className="text-center">
                <p className="text-base font-bold text-zinc-900 dark:text-white">
                  {profile.public_repos}
                </p>
                <p>repos</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-zinc-900 dark:text-white">
                  {profile.account_age_years}y
                </p>
                <p>on GitHub</p>
              </div>
            </div>
          </div>

          {profile.top_languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.top_languages.map((lang) => (
                <span key={lang} className={`badge ${getLangColor(lang)}`}>
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
