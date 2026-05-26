import { supabase } from "@/lib/supabase";
import type { Card } from "@/lib/gacha/pullLogic";

export async function saveGuestResults(pendingResults: Card[]) {
  const existingInventory = JSON.parse(
    localStorage.getItem("guest_inventory") ?? "[]"
  );

  const existingHistory = JSON.parse(
    localStorage.getItem("guest_history") ?? "[]"
  );

  const now = new Date().toISOString();

  const guestCards = pendingResults.map((card, index) => ({
    id: `${Date.now()}-${index}`,
    card_name: card.name,
    rarity: card.rarity,
    image: card.image,
    created_at: now,
  }));

  localStorage.setItem(
    "guest_inventory",
    JSON.stringify([...guestCards, ...existingInventory])
  );

  localStorage.setItem(
    "guest_history",
    JSON.stringify([...guestCards, ...existingHistory])
  );
}

export async function saveUserResults(
  userId: string,
  pullCount: number,
  pendingResults: Card[]
) {
  const { data: session, error: sessionError } = await supabase
    .from("pull_sessions")
    .insert({
      user_id: userId,
      pull_type: pullCount === 10 ? "ten" : "single",
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const rows = pendingResults.map((card, index) => ({
    session_id: session.id,
    user_id: userId,
    card_name: card.name,
    rarity: card.rarity,
    image: card.image,
    result_order: index + 1,
  }));

  const { error: resultError } = await supabase
    .from("pull_results")
    .insert(rows);

  if (resultError) {
    throw new Error(resultError.message);
  }
}