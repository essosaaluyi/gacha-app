"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import ReturnRatePanel from "@/components/admin/ReturnRatePanel";
import { supabase } from "@/lib/supabase";
import {
  patchConfig,
  savePatchConfigOverrides,
  clearPatchConfigOverrides,
} from "@/lib/game-config/patchConfig";
import {
  getBaselineResultShares,
  getBattleOutcomeOrder,
} from "@/lib/battle-pixi/core/resultLottery";

const ADMIN_USER_ID = "3cc85df4-ff1a-4118-ad3a-2d9f58eba404";

/** Where the outcome pins live, as a dotted path into patchConfig. */
const PIN_PREFIX = "debug.forceResultProbability";

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
  source: "config" | "server";
  fields: Field[];
  totalTo?: number; // if set, show a running total and flag when off
  /** "odds" renders the read-only spreadsheet share beside each override. */
  variant?: "fields" | "odds";
};

type TabKey = "gacha" | "battle" | "bonus" | "rewards" | "server";

const TABS: { key: TabKey; label: string }[] = [
  { key: "gacha", label: "Gacha" },
  { key: "battle", label: "Battle" },
  { key: "bonus", label: "Bonus" },
  { key: "rewards", label: "Rewards" },
  { key: "server", label: "Server" },
];

// The battle-outcome pin rows are derived from the engine's own outcome list so
// a new outcome in the spreadsheet shows up here without editing this file.
const ODDS_SECTION: Section = {
  title: "Card Odds",
  desc:
    "Battle symbol odds. Leave an override at 0 to use the spreadsheet value. " +
    "Anything above 0 pins that outcome to exactly that share and rescales the rest.",
  source: "config",
  variant: "odds",
  fields: getBattleOutcomeOrder().map((outcome) => ({
    path: `${PIN_PREFIX}.${outcome}`,
    label: outcome,
    kind: "pct01" as FieldKind,
    hint: "%",
  })),
};

const SECTIONS: Record<TabKey, Section[]> = {
  gacha: [
    {
      title: "Gacha Odds",
      desc: "Pull rarity chances. Should total 100%.",
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
      title: "Daily Gacha",
      desc: "Rotating lineup size and the simulated community pull counter.",
      source: "config",
      fields: [
        { path: "dailyGacha.activeCardsPerDay", label: "Cards per day", hint: "cards" },
        { path: "dailyGacha.communitySim.basePulls", label: "Community base", hint: "pulls" },
        { path: "dailyGacha.communitySim.variance", label: "Daily variance", kind: "pct01", hint: "%" },
      ],
    },
  ],
  battle: [
    ODDS_SECTION,
    {
      title: "Fatal Mode",
      desc:
        "Both windows are counted in draws. Enemy: draws to escape once the " +
        "enemy's counter empties. Player: draws to finish the enemy after landing an attack.",
      source: "config",
      fields: [
        { path: "fatalMode.enemyWindowTurns", label: "Enemy window", hint: "draws" },
        { path: "fatalMode.playerWindowGames", label: "Player window", hint: "draws" },
      ],
    },
    {
      title: "Empty-Slot Attack",
      desc: "Attack-attempt chance on an empty draw, by the active card's tier.",
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
      desc: "Rolled per buildup game, plus how many buildup games precede the payoff.",
      source: "config",
      fields: [
        { path: "fakeout.presentations.0.weight", label: "Dialogue", hint: "weight" },
        { path: "fakeout.presentations.1.weight", label: "Chance reveal", hint: "weight" },
        { path: "fakeout.buildupGames", label: "Buildup games", hint: "before payoff" },
      ],
    },
    {
      title: "Battle Draw Costs",
      desc: "Points charged for the next draw, based on the previous outcome.",
      source: "config",
      fields: [
        { path: "economy.drawCosts.normal", label: "Normal", hint: "pts" },
        { path: "economy.drawCosts.afterReply", label: "After replay", hint: "pts" },
        { path: "economy.drawCosts.afterChance", label: "After chance", hint: "pts" },
        { path: "economy.drawCosts.afterBar", label: "After bars", hint: "pts" },
      ],
    },
  ],
  bonus: [
    {
      title: "Bonus Bar Reset",
      desc: "Per bonus game: chance of a real reset vs a bar fakeout.",
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
  ],
  rewards: [
    {
      title: "Gift Box",
      desc: "Ad-view bonus and milestone reward payouts.",
      source: "config",
      fields: [
        { path: "giftBox.adRewardPoints", label: "Ad reward", hint: "pts" },
        { path: "giftBox.milestones.0.points", label: "50 games", hint: "pts" },
        { path: "giftBox.milestones.1.points", label: "200 games", hint: "pts" },
      ],
    },
    {
      title: "Shop",
      desc: "Item costs. Enabled: 1 opens redeeming, 0 keeps it in preview.",
      source: "config",
      fields: [
        { path: "shop.enabled", label: "Enabled", hint: "0/1" },
        { path: "shop.items.0.cost", label: "Single ticket", hint: "pts" },
        { path: "shop.items.1.cost", label: "10-pull ticket", hint: "pts" },
        { path: "shop.items.2.cost", label: "BGM pack", hint: "pts" },
      ],
    },
  ],
  server: [
    {
      title: "Point Economy",
      desc: "Shared account values stored on the server, not in local config.",
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
    },
  ],
};

const ALL_SECTIONS = TABS.flatMap((tab) => SECTIONS[tab.key]);
const CONFIG_SECTIONS = ALL_SECTIONS.filter((s) => s.source === "config");
const SERVER_SECTIONS = ALL_SECTIONS.filter((s) => s.source === "server");

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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default function AdminPage() {
  const [message, setMessage] = useState("Loading...");
  const [isAllowed, setIsAllowed] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("gacha");

  const baselineShares = useMemo(() => getBaselineResultShares(), []);

  // Which outcomes currently carry a pin, so the banner can call them out.
  const activePins = useMemo(
    () =>
      ODDS_SECTION.fields
        .filter((field) => (values[field.path] ?? 0) > 0)
        .map((field) => field.label),
    [values]
  );

  const dirty = useMemo(
    () => Object.keys(values).some((key) => values[key] !== saved[key]),
    [values, saved]
  );

  async function checkAdminAndLoad() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return setMessage("Access denied. Please log in.");
    if (user.id !== ADMIN_USER_ID) return setMessage("Access denied. Admin only.");

    setIsAllowed(true);

    const { data } = await supabase.from("point_settings").select("*");
    const serverMap: Record<string, number> = {};
    (data ?? []).forEach((row) => {
      serverMap[row.setting_key] = row.setting_value;
    });

    const next: Record<string, number> = {};
    for (const section of CONFIG_SECTIONS) {
      for (const field of section.fields) {
        const raw = getPath(patchConfig, field.path);
        next[field.path] = field.kind === "pct01" ? round2(raw * 100) : raw;
      }
    }
    for (const section of SERVER_SECTIONS) {
      for (const field of section.fields) {
        next[field.path] = serverMap[field.path] ?? 0;
      }
    }

    setValues(next);
    setSaved(next);
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

    const overrides: Record<string, unknown> = {};
    for (const section of CONFIG_SECTIONS) {
      for (const field of section.fields) {
        // An outcome pin of 0 means "not pinned" rather than "pinned to never".
        // Writing the 0 would zero that outcome out, so it is omitted and the
        // spreadsheet value stands.
        if (field.path.startsWith(PIN_PREFIX) && (values[field.path] ?? 0) <= 0) {
          continue;
        }

        const raw = values[field.path] ?? 0;
        setPath(overrides, field.path, field.kind === "pct01" ? raw / 100 : raw);
      }
    }

    // The pin dictionary must be present even when empty: applyOverrides
    // assigns this key outright, which is the only way "no pins at all" can be
    // expressed. Omitting it would leave the previous pins standing.
    if (!overrides.debug) overrides.debug = {};
    const debug = overrides.debug as Record<string, unknown>;
    if (!debug.forceResultProbability) debug.forceResultProbability = {};

    savePatchConfigOverrides(overrides);

    for (const section of SERVER_SECTIONS) {
      for (const field of section.fields) {
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
    }

    setSaved(values);
    setSaving(false);
    setMessage("All settings saved.");
  }

  function resetConfig() {
    clearPatchConfigOverrides();
    setMessage("Config reset to defaults. Reload to confirm.");
    void checkAdminAndLoad();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      <TopBar />

      <div className="max-w-4xl mx-auto px-6">
        <header className="pt-6 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Game Balance</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Config changes apply instantly. Reload the battle to pick up
            draw-cost and window-length changes.
          </p>
        </header>

        {message && (
          <p className="mb-4 text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            {message}
          </p>
        )}

        {isAllowed && activePins.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3">
            <p className="text-sm font-semibold text-amber-200">
              {activePins.length} card-odds{" "}
              {activePins.length === 1 ? "pin is" : "pins are"} active
            </p>
            <p className="text-xs text-amber-200/70 mt-1">
              {activePins.join(", ")} — the game is not running on spreadsheet
              odds. Clear these before release.
            </p>
          </div>
        )}

        {isAllowed && (
          <>
            <nav className="flex flex-wrap gap-1 border-b border-zinc-800 mb-5">
              {TABS.map(({ key, label }) => {
                const active = key === tab;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    aria-current={active ? "page" : undefined}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                      active
                        ? "border-emerald-500 text-zinc-100 bg-zinc-900/60"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>

            <div className="space-y-4">
              {SECTIONS[tab].map((section) => (
                <SectionCard
                  key={section.title}
                  section={section}
                  values={values}
                  setValue={setValue}
                  baselineShares={baselineShares}
                />
              ))}

              {tab === "server" && <ReturnRatePanel />}
            </div>
          </>
        )}
      </div>

      {isAllowed && (
        <div className="fixed bottom-0 inset-x-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-500">
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={resetConfig}
                className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-medium"
              >
                Reset config
              </button>
              <button
                onClick={saveAll}
                disabled={saving || !dirty}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-sm font-semibold"
              >
                {saving ? "Saving…" : "Save all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionCard({
  section,
  values,
  setValue,
  baselineShares,
}: {
  section: Section;
  values: Record<string, number>;
  setValue: (path: string, value: number) => void;
  baselineShares: Record<string, number>;
}) {
  const total = section.totalTo
    ? section.fields.reduce((sum, f) => sum + (values[f.path] ?? 0), 0)
    : null;
  const totalOff = total != null && Math.abs(total - (section.totalTo ?? 0)) > 0.01;

  return (
    <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold text-zinc-100">{section.title}</h2>
        {total != null && (
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded ${
              totalOff
                ? "bg-rose-950 text-rose-300"
                : "bg-emerald-950 text-emerald-300"
            }`}
          >
            total {round2(total)}%
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">{section.desc}</p>

      {/* minmax(0,1fr), not 1fr: every row below is its own grid, so a plain
          1fr resolves against that row's own content. A long outcome name (or
          the PINNED tag) then widened its own first column and shoved the two
          number columns right, leaving the table visibly ragged once the panel
          got narrow -- the Sheet column landed at four different x-positions at
          375px. Letting the name column shrink below its content width gives
          every row the same free space, so the columns line up at any width. */}
      {section.variant === "odds" ? (
        <div className="space-y-1">
          <div className="grid grid-cols-[minmax(0,1fr)_5rem_7rem] gap-3 pb-1 text-[11px] uppercase tracking-wide text-zinc-600">
            <span>Outcome</span>
            <span className="text-right">Sheet</span>
            <span className="text-right">Override</span>
          </div>
          {section.fields.map((field) => {
            const pinned = (values[field.path] ?? 0) > 0;
            return (
              <label
                key={field.path}
                className="grid grid-cols-[minmax(0,1fr)_5rem_7rem] gap-3 items-center py-1"
              >
                <span className="min-w-0 truncate text-sm text-zinc-300 flex items-center gap-2">
                  {field.label}
                  {pinned && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded">
                      Pinned
                    </span>
                  )}
                </span>
                <span className="text-sm font-mono text-zinc-500 text-right tabular-nums">
                  {(baselineShares[field.label] ?? 0).toFixed(1)}%
                </span>
                <NumberInput
                  value={values[field.path] ?? 0}
                  hint={field.hint}
                  highlighted={pinned}
                  onChange={(v) => setValue(field.path, v)}
                />
              </label>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {section.fields.map((field) => (
            <label key={field.path} className="block">
              <span className="block text-xs text-zinc-400 mb-1.5">
                {field.label}
              </span>
              <NumberInput
                value={values[field.path] ?? 0}
                hint={field.hint}
                onChange={(v) => setValue(field.path, v)}
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

function NumberInput({
  value,
  hint,
  highlighted,
  onChange,
}: {
  value: number;
  hint?: string;
  highlighted?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className={`flex items-center bg-zinc-800/70 border rounded-lg overflow-hidden focus-within:border-emerald-600 ${
        highlighted ? "border-amber-700/70" : "border-zinc-700"
      }`}
    >
      <input
        type="number"
        step="any"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full bg-transparent px-2.5 py-1.5 text-sm text-zinc-100 outline-none tabular-nums"
      />
      {hint && (
        <span className="pr-2 text-xs text-zinc-500 shrink-0">{hint}</span>
      )}
    </div>
  );
}
