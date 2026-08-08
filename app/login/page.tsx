"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import TopBar from "@/components/TopBar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const ensureUserPoints = async (userId: string) => {
    const { data: existing } = await supabase
      .from("user_points")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return;

    const { data: setting } = await supabase
      .from("point_settings")
      .select("setting_value")
      .eq("setting_key", "starting_points")
      .single();

    const startingPoints = setting?.setting_value ?? 1000;

    await supabase.from("user_points").insert({
      user_id: userId,
      points: startingPoints,
    });
  };

  const signUp = async () => {
    setMessage("Creating account...");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Signup success. You can now log in.");
  };

  const signIn = async () => {
    setMessage("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await ensureUserPoints(user.id);
      localStorage.removeItem("guest_mode");
    }

    setMessage("Login success.");
    window.location.href = "/menu";
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col pb-6">
      <TopBar />

      <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 p-6 rounded-2xl">
        <h1 className="text-2xl font-bold mb-4">Login / Signup</h1>

        <input
          className="w-full mb-3 p-3 rounded bg-zinc-800 border border-zinc-700"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full mb-4 p-3 rounded bg-zinc-800 border border-zinc-700"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={signUp}
            className="flex-1 bg-blue-600 hover:bg-blue-500 p-3 rounded font-semibold"
          >
            Sign Up
          </button>

          <button
            onClick={signIn}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 p-3 rounded font-semibold"
          >
            Log In
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-zinc-300">{message}</p>}
      </div>
      </div>
    </main>
  );
}