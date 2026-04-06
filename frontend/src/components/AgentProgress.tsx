"use client";

import { useEffect, useState } from "react";

type AgentStatus = {
  name: string;
  label: string;
  state: "waiting" | "active" | "done";
  message: string;
  startTime?: number;
};

type Props = {
  agents: AgentStatus[];
  onCancel: () => void;
};

function AgentRow({ agent }: { agent: AgentStatus }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (agent.state !== "active" || !agent.startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - agent.startTime!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [agent.state, agent.startTime]);

  return (
    <div className="flex items-start gap-4 py-4">
      {/* Status dot */}
      <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center">
        {agent.state === "waiting" && (
          <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        )}
        {agent.state === "active" && (
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
        )}
        {agent.state === "done" && (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm font-medium ${
              agent.state === "waiting"
                ? "text-zinc-400 dark:text-zinc-600"
                : agent.state === "active"
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {agent.label}
          </p>
          {agent.state === "active" && agent.startTime && (
            <span className="text-xs text-zinc-400 shrink-0">{elapsed}s</span>
          )}
          {agent.state === "done" && (
            <span className="text-xs text-green-500 shrink-0">Done</span>
          )}
        </div>
        <p
          className={`text-xs mt-0.5 leading-relaxed ${
            agent.state === "waiting"
              ? "text-zinc-300 dark:text-zinc-700"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {agent.message}
        </p>
      </div>
    </div>
  );
}

export default function AgentProgress({ agents, onCancel }: Props) {
  const doneCount = agents.filter((a) => a.state === "done").length;
  const progressPct = Math.round((doneCount / agents.length) * 100);
  const activeAgent = agents.find((a) => a.state === "active");

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        Finding your perfect issues...
      </h1>
      <p className="text-zinc-500 text-sm mb-6">
        {activeAgent ? activeAgent.message : "Starting up..."}
      </p>

      {/* Progress bar */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mb-8">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Agent rows */}
      <div className="card divide-y divide-border dark:divide-zinc-800 mb-6">
        {agents.map((agent) => (
          <AgentRow key={agent.name} agent={agent} />
        ))}
      </div>

      <button
        onClick={onCancel}
        className="btn-ghost text-sm text-zinc-500"
      >
        Cancel
      </button>
    </div>
  );
}
