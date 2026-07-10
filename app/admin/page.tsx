"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import { supabase } from "@/lib/supabase";
import {
  patchConfig,
  savePatchConfigOverrides,
  clearPatchConfigOverrides,
} from "@/lib/game-config/patchConfig";

const ADMIN_USER_ID = "3cc85df4-ff1a-4118-ad3a-2d9f58eba404";

type FieldKind = "num" | "pct01";

type Field = {
  path: string;
  label: string;
  kind?: FieldKind; // "pct01" = stored 0-1, shown as %
  hint?: string;
};

type Section = {
  title: string;
  desc: string;
  accent: string; // tailwind text color for the heading bar
  source: "config" | "server";
  fields: Field[];
  totalTo?: number; // if set, show a running total and flag when off
};

// ---- Config (localStorage override) sections -------------------------------

const CONFIG_SECTIONS: Section[] = [
  {
    title: "Gacha Odds",
    desc: "Pull rarity chances. Should total 100%.",
    accent: "text-fuchsia-400",
    source: "config",
    totalTo: 100,
    fields: [
      { path: "gachaOdds.R", label: "R", hint: "%" },
      { path: "gachaOdds.SR", label: "SR", hint: "%" },
      { path: "gachaOdds.SSR", label: "SSR", hint: "%" },
      { path: "gachaOdds.UR", label: "UR", hint: "%" },
    ],
  },
  {
    title: "Empty-Slot Attack",
    desc: "Attack-attempt chance on an empty draw, by the active card's tier.",
    accent: "text-sky-400",
    source: "config",
    fields: [
      { path: "emptySlotAttack.ratesByTier.R", label: "R tier", hint: "%" },
      { path: "emptySlotAttack.ratesByTier.SR", label: "SR tier", hint: "%" },
      { path: "emptySlotAttack.ratesByTier.SSR", label: "SSR tier", hint: "%" },
      { path: "emptySlotAttack.ratesByTier.UR", label: "UR tier", hint: "%" },
    ],
  },
  {
    title: "Fakeout Presentation",
    desc: "Relative weights for how an attack attempt is presented.",
    accent: "text-violet-400",
    source: "config",
    fields: [
      { path: "fakeout.variants.0.weight", label: "No fakeout", hint: "weight" },
      { path: "fakeout.variants.1.weight", label: "Delayed 3-game", hint: "weight" },
      { path: "fakeout.variants.2.weight", label: "Classic", hint: "weight" },
    ],
  },
  {
    title: "Bonus Bar Reset",
    desc: "Per bonus game: chance of a real reset vs a bar fakeout.",
    accent: "text-amber-400",
    source: "config",
    fields: [
      { path: "barReset.realResetChance", label: "Real reset", kind: "pct01", hint: "%" },
      { path: "barReset.fakeChance", label: "Bar fakeout", kind: "pct01", hint: "%" },
      { path: "barReset.fakePoints", label: "Fakeout payout", hint: "pts" },
    ],
  },
  {
    title: "Nested Loop Bonus",
    desc: "Nested bonus selection and the Chance-card reward table.",
    accent: "text-emerald-400",
    source: "config",
    fields: [
      { path: "nestedBonus.selectionShare", label: "Nested chosen", hint: "%" },
      { path: "nestedBonus.nestedMinPoints", label: "Min per game", hint: "pts" },
      { path: "nestedBonus.nestedChanceTable.0.weight", label: "50 pts weight", hint: "weight" },
      { path: "nestedBonus.nestedChanceTable.1.weight", label: "100 pts weight", hint: "weight" },
      { path: "nestedBonus.nestedChanceTable.2.weight", label: "200 pts weight", hint: "weight" },
      { path: "nestedBonus.nestedChanceTable.3.weight", label: "300 pts weight", hint: "weight" },
    ],
  },
  {
    title: "Daily Gacha",
    desc: "Rotating lineup size and the simulated community pull counter.",
    accent: "text-teal-400",
    source: "config",
    fields: [
      { path: "dailyGacha.activeCardsPerDay", label: "Cards per day", hint: "cards" },
      { path: "dailyGacha.communitySim.basePulls", label: "Community base", hint: "pulls" },
      { path: "dailyGacha.communitySim.variance", label: "Daily variance", kind: "pct01", hint: "%" },
    ],
  },
  {
    title: "Gift Box",
    desc: "Ad-view bonus and milestone reward payouts.",
    accent: "text-violet-400",
    source: "config",
    fields: [
      { path: "giftBox.adRewardPoints", label: "Ad reward", hint: "pts" },
      { path: "giftBox.milestones.0.points", label: "50 games", hint: "pts" },
      { path: "giftBox.milestones.1.points", label: "200 games", hint: "pts" },
    ],
  },
  {
    title: "Battle Draw Costs",
    desc: "Points charged for the next draw, based on the previous outcome.",
    accent: "text-rose-400",
    source: "config",
    fields: [
      { path: "economy.drawCosts.normal", label: "Normal", hint: "pts" },
      { path: "economy.drawCosts.afterReply", label: "After replay", hint: "pts" },
      { path: "economy.drawCosts.afterChance", label: "After chance", hint: "pts" },
      { path: "economy.drawCosts.afterBar", label: "After bars", hint: "pts" },
    ],
  },
];

const SERVER_SECTION: Section = {
  title: "Point Economy (server)",
  desc: "Shared account values stored on the server.",
  accent: "text-yellow-400",
  source: "server",
  fields: [
    { path: "single_pull_cost", label: "Single pull cost", hint: "pts" },
    { path: "ten_pull_cost", label: "Ten pull cost", hint: "pts" },
    { path: "starting_points", label: "Starting points", hint: "pts" },
    { path: "member_daily_points", label: "Member daily", hint: "pts" },
    { path: "guest_daily_points", label: "Guest daily", hint: "pts" },
    { path: "return_R", label: "Return R", hint: "pts" },
    { path: "return_SR", label: "Return SR", hint: "pts" },
    { path: "return_SSR", label: "Return SSR", hint: "pts" },
    { path: "return_UR", label: "Return UR", hint: "pts" },
  ],
};

// ---- path helpers ----------------------------------------------------------

function getPath(obj: unknown, path: string): number {
  const value = path
    .split(".")
    .reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
  return typeof value === "number" ? value : 0;
}

function setPath(obj: Record<string, unknown>, path: string, value: number) {
  const keys = path.split(".");
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (node[key] == null || typeof node[key] !== "object") {
      node[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

export default function AdminPage() {
  const [message, setMessage] = useState("Loading...");
  const [isAllowed, setIsAllowed] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const allSections = useMemo(() => [...CONFIG_SECTIONS, SERVER_SECTION], []);

  async function checkAdminAndLoad() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return setMessage("Access denied. Please log in.");
    if (user.id !== ADMIN_USER_ID) return setMessage("Access denied. Admin only.");

    setIsAllowed(true);

    // server values
    const { data } = await supabase.from("point_settings").select("*");
    const serverMap: Record<string, number> = {};
    (data ?? []).forEach((row) => {
      serverMap[row.setting_key] = row.setting_value;
    });

    // build the flat editing model from live config + server
    const next: Record<string, number> = {};
    for (const section of CONFIG_SECTIONS) {
      for (const field of section.fields) {
        const raw = getPath(patchConfig, field.path);
        next[field.path] = field.kind === "pct01" ? round2(raw * 100) : raw;
      }
    }
    for (const field of SERVER_SECTION.fields) {
      next[field.path] = serverMap[field.path] ?? 0;
    }

    setValues(next);
    setMessage("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void checkAdminAndLoad(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setValue = (path: string, value: number) =>
    setValues((prev) => ({ ...prev, [path]: value }));

  async function saveAll() {
    setSaving(true);
    setMessage("Saving...");

    // 1. config overrides → localStorage + live patchConfig
    const overrides: Record<string, unknown> = {};
    for (const section of CONFIG_SECTIONS) {
      for (const field of section.fields) {
        const raw = values[field.path] ?? 0;
        setPath(overrides, field.path, field.kind === "pct01" ? raw / 100 : raw);
      }
    }
    savePatchConfigOverrides(overrides);

    // 2. server point_settings → Supabase
    for (const field of SERVER_SECTION.fields) {
      const { error } = await supabase.from("point_settings").upsert({
        setting_key: field.path,
        setting_value: values[field.path] ?? 0,
      });
      if (error) {
        setMessage(`Server save failed: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setMessage("All settings saved.");
  }

  function resetConfig() {
    clearPatchConfigOverrides();
    setMessage("Odds reset to defaults. Reload to confirm.");
    void checkAdminAndLoad();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <TopBar />

        <div className="flex items-center justify-between mt-4 mb-2">
          <h1 className="text-4xl font-black tracking-tight">Game Balance</h1>
          {isAllowed && (
            <div className="flex gap-3">
              <button
                onClick={resetConfig}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-semibold"
              >
                Reset odds
              </button>
              <button
                onClick={saveAll}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold"
              >
                {saving ? "Saving…" : "Save all"}
              </button>
            </div>
          )}
        </div>

        <p className="text-zinc-400 mb-6 text-sm">
          Odds apply instantly across the game. Reload the battle to pick up
          draw-cost / loop-length changes.
        </p>

        {message && (
          <p className="mb-6 text-sm text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded-xl px-4 py-3">
            {message}
          </p>
        )}

        {isAllowed && (
          <div className="grid gap-5 md:grid-cols-2">
            {allSections.map((section) => {
              const total = section.totalTo
                ? section.fields.reduce((sum, f) => sum + (values[f.path] ?? 0), 0)
                : null;
              const totalOff =
                total != null && Math.abs(total - (section.totalTo ?? 0)) > 0.01;

              return (
                <section
                  key={section.title}
                  className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <h2 className={`text-lg font-bold ${section.accent}`}>
                      {section.title}
                    </h2>
                    {total != null && (
                      <span
                        className={`text-xs font-mono px-2 py-1 rounded ${
                          totalOff
                            ? "bg-rose-950 text-rose-300"
                            : "bg-emerald-950 text-emerald-300"
                        }`}
                      >
                        total {round2(total)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mb-4">{section.desc}</p>

                  <div className="grid grid-cols-2 gap-3">
                    {section.fields.map((field) => (
                      <label key={field.path} className="block">
                        <span className="block text-xs text-zinc-400 mb-1">
                          {field.label}
                        </span>
                        <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-zinc-500">
                          <input
                            type="number"
                            step="any"
                            value={values[field.path] ?? 0}
                            onChange={(e) =>
                              setValue(field.path, Number(e.target.value))
                            }
                            className="w-full bg-transparent px-3 py-2 text-white outline-none"
                          />
                          {field.hint && (
                            <span className="px-2 text-xs text-zinc-500 shrink-0">
                              {field.hint}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
