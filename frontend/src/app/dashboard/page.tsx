"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import SkillProfileCard from "@/components/SkillProfileCard";

const LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java",
  "Ruby", "PHP", "C++", "C#", "Swift", "Kotlin", "Dart",
];

type Profile = {
  login: string;
  name: string;
  avatar_url: string;
  public_repos: number;
  top_languages: string[];
  account_age_years: number;
  github_url: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Preferences state
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("any");
  const [topics, setTopics] = useState("");
  const [prefOpen, setPrefOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    fetch(`${backendUrl}/api/user/profile`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        if (data.top_languages?.length) {
          setSelectedLangs(data.top_languages.slice(0, 3));
        }
        setProfileLoading(false);
      })
      .catch(() => setProfileLoading(false));
  }, [session]);

  const toggleLang = (lang: string) => {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const savePreferences = async () => {
    setSaving(true);
    // Preferences are passed as query params to the backend at run time;
    // they're also stored locally for the session. Supabase storage happens
    // server-side on the backend when the pipeline runs.
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFindIssues = () => {
    const params = new URLSearchParams({
      difficulty,
      languages: selectedLangs.join(","),
      topics,
    });
    router.push(`/results?${params.toString()}`);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const username = session?.user?.name || "developer";

  return (
    <div className="flex min-h-screen bg-surface dark:bg-zinc-950">
      <Sidebar active="dashboard" />

      <main className="flex-1 ml-0 md:ml-60 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          {/* Welcome */}
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Hey {username}, ready to contribute?
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
            Your AI agents will analyse your GitHub and find matching open source issues.
          </p>

          {/* Profile card */}
          <div className="mb-8">
            <SkillProfileCard profile={profile} loading={profileLoading} />
          </div>

          {/* Preferences */}
          <div className="card mb-8">
            <button
              onClick={() => setPrefOpen((o) => !o)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                Preferences
              </h2>
              <span className="text-zinc-400 text-sm">{prefOpen ? "▲" : "▼"}</span>
            </button>

            {prefOpen && (
              <div className="mt-5 space-y-5">
                {/* Language chips */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([...( profile?.top_languages || []), ...LANGUAGES])).slice(0, 15).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => toggleLang(lang)}
                        className={`badge cursor-pointer transition-colors ${
                          selectedLangs.includes(lang)
                            ? "bg-primary text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-violet-100 dark:hover:bg-violet-900"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Difficulty
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: "beginner", label: "Good first issue" },
                      { value: "intermediate", label: "Help wanted" },
                      { value: "any", label: "Any" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <input
                          type="radio"
                          name="difficulty"
                          value={opt.value}
                          checked={difficulty === opt.value}
                          onChange={() => setDifficulty(opt.value)}
                          className="accent-primary"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Topics (optional)
                  </label>
                  <input
                    type="text"
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    placeholder="e.g. machine learning, cli tools, databases..."
                    className="input w-full text-sm"
                  />
                </div>

                <button
                  onClick={savePreferences}
                  disabled={saving}
                  className="btn-ghost text-sm"
                >
                  {saved ? "Saved!" : saving ? "Saving..." : "Save preferences"}
                </button>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleFindIssues}
            className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold text-base rounded-xl transition-colors shadow-lg shadow-violet-500/20"
          >
            Find My Issues →
          </button>
        </div>
      </main>
    </div>
  );
}
