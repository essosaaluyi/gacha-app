import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initializePlayerBattleCards,
  getCurrentPlayerBattleCard,
  getRemainingPlayerBattleCards,
  getUpcomingPlayerBattleCards,
  getAvailablePlayerBattleCards,
  getPlayerBattleCardIndex,
  getSelectedPlayerBattleCardIndex,
  getPlayerBattleHandSnapshot,
  restorePlayerBattleHand,
  selectPlayerBattleCard,
  summonSelectedPlayerBattleCard,
  loadNextPlayerBattleCard,
  setPlayerBattleCardIndex,
  subscribePlayerBattleCard,
} from "../lib/battle-pixi/state/playerBattleCardStore.ts";

const deck = [
  { name: "UR1", rarity: "UR", image: "/ur1.webp" },
  { name: "R2", rarity: "R", image: "/r2.webp" },
  { name: "R2", rarity: "R", image: "/r2.webp" },
];

function initialize(saved) {
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => saved };
  initializePlayerBattleCards();
}

test("arbitrary choice consumes only the confirmed instance and locks reselection", () => {
  initialize(JSON.stringify(deck));
  assert.equal(getCurrentPlayerBattleCard(), null);
  assert.deepEqual(getUpcomingPlayerBattleCards(), deck);
  assert.equal(getRemainingPlayerBattleCards(), 3);
  let updates = 0;
  const unsubscribe = subscribePlayerBattleCard(() => updates++);
  assert.equal(summonSelectedPlayerBattleCard(), false);
  for (const index of [-1, 3, 1.5, NaN]) assert.equal(selectPlayerBattleCard(index), false);
  assert.equal(selectPlayerBattleCard(2), true);
  assert.equal(getCurrentPlayerBattleCard(), null);
  assert.equal(getRemainingPlayerBattleCards(), 3);
  assert.equal(summonSelectedPlayerBattleCard(), true);
  assert.equal(getPlayerBattleCardIndex(), 2);
  assert.deepEqual(getCurrentPlayerBattleCard(), deck[2]);
  assert.equal(getRemainingPlayerBattleCards(), 2);
  assert.equal(selectPlayerBattleCard(0), false);
  assert.equal(summonSelectedPlayerBattleCard(), false);
  assert.equal(updates, 2);
  unsubscribe();
  assert.deepEqual(getAvailablePlayerBattleCards().map(({ index }) => index), [0, 1]);
});

test("defeat opens unused selection; identical characters remain independent instances", () => {
  initialize(JSON.stringify(deck));
  selectPlayerBattleCard(2);
  summonSelectedPlayerBattleCard();
  assert.equal(loadNextPlayerBattleCard(), true);
  assert.equal(getCurrentPlayerBattleCard(), null);
  assert.equal(selectPlayerBattleCard(2), false);
  assert.equal(selectPlayerBattleCard(1), true);
  assert.equal(summonSelectedPlayerBattleCard(), true);
  assert.equal(getPlayerBattleCardIndex(), 1);
  assert.equal(loadNextPlayerBattleCard(), true);
  assert.equal(selectPlayerBattleCard(0), true);
  summonSelectedPlayerBattleCard();
  assert.equal(loadNextPlayerBattleCard(), false);
  assert.equal(getRemainingPlayerBattleCards(), 0);
  assert.deepEqual(getAvailablePlayerBattleCards(), []);
});

test("single pull and an explicitly empty hand exhaust without demo replacement", () => {
  initialize(JSON.stringify([deck[0]]));
  selectPlayerBattleCard(0);
  summonSelectedPlayerBattleCard();
  assert.equal(getRemainingPlayerBattleCards(), 0);
  assert.equal(loadNextPlayerBattleCard(), false);
  initialize("[]");
  assert.equal(getCurrentPlayerBattleCard(), null);
  assert.equal(getRemainingPlayerBattleCards(), 0);
  assert.equal(selectPlayerBattleCard(0), false);
});

test("old forward-consumption index migrates including duplicate prefix entries", () => {
  initialize(JSON.stringify(deck));
  setPlayerBattleCardIndex(1);
  assert.deepEqual(getCurrentPlayerBattleCard(), deck[1]);
  assert.equal(getRemainingPlayerBattleCards(), 1);
  assert.deepEqual(getPlayerBattleHandSnapshot().summonedIndices, [0, 1]);
  initialize(JSON.stringify(deck));
  restorePlayerBattleHand(undefined, 2);
  assert.equal(getPlayerBattleCardIndex(), 2);
  assert.equal(getRemainingPlayerBattleCards(), 0);
});

test("waiting and active snapshots restore hand/order independently of local deck edits", () => {
  initialize(JSON.stringify(deck));
  selectPlayerBattleCard(2);
  const waiting = getPlayerBattleHandSnapshot();
  initialize(JSON.stringify([deck[0]]));
  restorePlayerBattleHand(waiting);
  assert.equal(getCurrentPlayerBattleCard(), null);
  assert.equal(getSelectedPlayerBattleCardIndex(), 2);
  summonSelectedPlayerBattleCard();
  const active = getPlayerBattleHandSnapshot();
  initialize("[]");
  restorePlayerBattleHand(active);
  assert.equal(getPlayerBattleCardIndex(), 2);
  assert.equal(selectPlayerBattleCard(0), false);
  loadNextPlayerBattleCard();
  const afterDefeat = getPlayerBattleHandSnapshot();
  initialize("[]");
  restorePlayerBattleHand(afterDefeat);
  assert.equal(getCurrentPlayerBattleCard(), null);
  assert.equal(selectPlayerBattleCard(2), false);
  assert.deepEqual(getUpcomingPlayerBattleCards(), deck.slice(0, 2));
});

test("tentative drag/drop choices consume nothing until confirmation; duplicate Yes consumes once", () => {
  initialize(JSON.stringify(deck));
  const original = getRemainingPlayerBattleCards();
  selectPlayerBattleCard(2);
  // No/outside drop/cancellation do not call the commit action.
  assert.equal(getCurrentPlayerBattleCard(), null);
  assert.equal(getRemainingPlayerBattleCards(), original);
  assert.deepEqual(getPlayerBattleHandSnapshot().summonedIndices, []);
  selectPlayerBattleCard(1);
  assert.equal(summonSelectedPlayerBattleCard(), true);
  assert.equal(summonSelectedPlayerBattleCard(), false);
  assert.equal(getPlayerBattleCardIndex(), 1);
  assert.equal(getRemainingPlayerBattleCards(), original - 1);
  assert.deepEqual(getAvailablePlayerBattleCards().map(({ index }) => index), [0, 2]);
});

test("missing or invalid storage safely supplies the demo deck", () => {
  for (const saved of [null, "broken", "null", "{}", '[null]', '[{"name":"R1"}]']) {
    initialize(saved);
    assert.equal(getCurrentPlayerBattleCard(), null);
    assert.equal(getUpcomingPlayerBattleCards()[0].name, "R4");
    assert.equal(getRemainingPlayerBattleCards(), 3);
  }
  globalThis.localStorage = { getItem() { throw new Error("Storage unavailable"); } };
  initializePlayerBattleCards();
  assert.equal(getUpcomingPlayerBattleCards()[0].name, "R4");
});
