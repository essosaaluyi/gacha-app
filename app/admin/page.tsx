"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { supabase } from "@/lib/supabase";

type SettingMap = Record<string, number>;

const ADMIN_USER_ID = "3cc85df4-ff1a-4118-ad3a-2d9f58eba404";

export default function AdminPage() {
  const [settings, setSettings] = useState<SettingMap>({});
  const [message, setMessage] = useState("Loading...");
  const [isAllowed, setIsAllowed] = useState(false);

  const settingKeys = [
    "single_pull_cost",
    "ten_pull_cost",
    "return_R",
    "return_SR",
    "return_SSR",
    "return_UR",
    "starting_points",
    "member_daily_points",
    "guest_daily_points",
    "battle_cost",

    "reveal_ur_standard",
    "reveal_ur_standard2",
    "reveal_ur_ssr",
    "reveal_ur_ur1",
    "reveal_ur_ur2",

    "reveal_ssr_standard",
    "reveal_ssr_standard2",
    "reveal_ssr_ssr",

    "reveal_sr3_standard",
    "reveal_sr3_standard2",

    "reveal_default_standard",
    "reveal_default_standard2",

    "reveal_freeze_chance",
  ];

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Access denied. Please log in.");
      return;
    }

    if (user.id !== ADMIN_USER_ID) {
      setMessage("Access denied. Admin only.");
      return;
    }

    setIsAllowed(true);
    await loadSettings();
  };

  const loadSettings = async () => {
    const { data, error } = await supabase.from("point_settings").select("*");

    if (error) {
      setMessage(error.message);
      return;
    }

    const map: SettingMap = {};

    (data || []).forEach((row) => {
      map[row.setting_key] = row.setting_value;
    });

    setSettings(map);
    setMessage("");
  };

  const updateSetting = (key: string, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = async () => {
    setMessage("Saving...");

    for (const key of settingKeys) {
      const { error } = await supabase.from("point_settings").upsert({
        setting_key: key,
        setting_value: settings[key] ?? 0,
      });

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    setMessage("Settings saved.");
    alert("Settings saved.");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <TopBar />

        <h1 className="text-4xl font-bold mb-8">Admin Settings</h1>

        {message && <p className="text-zinc-300 mb-6">{message}</p>}

        {isAllowed && (
          <>
            <div className="grid gap-4">
              {settingKeys.map((key) => (
                <div
                  key={key}
                  className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4"
                >
                  <label className="block text-sm text-zinc-400 mb-2">
                    {key}
                  </label>

                  <input
                    type="number"
                    value={settings[key] ?? 0}
                    onChange={(e) => updateSetting(key, Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={saveSettings}
              className="mt-8 bg-emerald-600 hover:bg-emerald-500 px-6 py-4 rounded-2xl font-bold text-lg"
            >
              Save Settings
            </button>
          </>
        )}
      </div>
    </main>
  );
}