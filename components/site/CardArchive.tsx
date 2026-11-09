"use client";

import CardFrame from "@/components/gacha/CardFrame";

import Link from "next/link";
import { useState } from "react";
import SiteIcon from "./SiteIcon";
import SoftDialog from "./SoftDialog";

export type ArchiveCard = { card_name: string; rarity: string; image: string; ids: string[]; count: number };

type Props = {
  cards: ArchiveCard[];
  message: string;
  points: number;
  returnValues: Record<string, number>;
  selectedCounts: Record<string, number>;
  setSellCount: (name: string, amount: number, max: number) => void;
  totalSelectedCount: number;
  totalSellPoints: number;
  onReviewSale: () => void;
  onClearSelection: () => void;
};

export default function CardArchive({ cards, message, points, returnValues, selectedCounts, setSellCount, totalSelectedCount, totalSellPoints, onReviewSale, onClearSelection }: Props) {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("All");
  const [selectedCard, setSelectedCard] = useState<ArchiveCard | null>(null);
  const [draftCount, setDraftCount] = useState(1);
  const [zoomCard, setZoomCard] = useState<ArchiveCard | null>(null);
  const filtered = cards.filter((card) => (rarity === "All" || card.rarity === rarity) && card.card_name.toLowerCase().includes(query.toLowerCase()));
  const totalOwned = cards.reduce((sum, card) => sum + card.count, 0);
  const openCard = (card: ArchiveCard) => { setSelectedCard(card); setDraftCount(selectedCounts[card.card_name] || 1); };
  const changeDraft = (amount: number) => setDraftCount(Math.max(0, Math.min(selectedCard?.count ?? 0, Math.trunc(Number.isFinite(amount) ? amount : 0))));

  return <div className="archive-shell">
    <header className="site-page-heading archive-heading">
      <div><p className="site-eyebrow">YOUR COLLECTION</p><h1>Card Archive<span className="site-heading-dot">.</span></h1><p>Every card, a new possibility. Keep your favorites or turn extras into points.</p></div>
      <div className="archive-wallet"><SiteIcon name="coin" /><div><span>YOUR POINTS</span><strong>{points.toLocaleString()}</strong></div></div>
    </header>
    <div className="archive-toolbar">
      <div className="archive-owned"><SiteIcon name="cards" /><strong>{totalOwned}</strong><span>cards · {cards.length} unique</span></div>
      <label className="archive-search"><SiteIcon name="search" /><input type="search" aria-label="Search your cards" placeholder="Find a card…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    <div className="archive-filter-row"><div className="archive-filters" role="group" aria-label="Filter by rarity">{["All", "R", "SR", "SSR", "UR"].map((value) => <button key={value} type="button" aria-pressed={rarity === value} onClick={() => setRarity(value)}>{value === "All" ? "All cards" : value}</button>)}</div><span>Tap a card to choose a quantity</span></div>
    {message && <p className="archive-message" role="status">{message}</p>}
    {!message && cards.length === 0 && <div className="archive-empty"><SiteIcon name="cards" /><h2>Your collection starts here</h2><p>Open a pack to discover your first cards.</p><Link href="/gacha" className="site-primary">Open a pack <SiteIcon name="arrow" /></Link></div>}
    {cards.length > 0 && filtered.length === 0 && <p className="archive-message">No cards match your search.</p>}
    <div className="archive-grid">{filtered.map((card) => {
      const selected = selectedCounts[card.card_name] ?? 0;
      return <article key={card.card_name} className={`archive-card${selected ? " archive-card-selected" : ""}`}>
        <div className="archive-card-top"><span className={`archive-rarity archive-rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span><span className="archive-card-owned" aria-label={`Owned: ${card.count}`}><SiteIcon name="cards" />{card.count}</span></div>
        <div className="archive-art"><button type="button" className="archive-art-button" onClick={() => openCard(card)} aria-label={`Select ${card.card_name} for sale`}><CardFrame src={card.image} alt={card.card_name} rarity={card.rarity} /></button><button type="button" className="archive-zoom" onClick={() => setZoomCard(card)} aria-label={`Enlarge ${card.card_name}`}><SiteIcon name="search" /></button>{selected > 0 && <span className="archive-selected-badge"><SiteIcon name="check" />{selected} selected</span>}</div>
        <h2><button type="button" onClick={() => openCard(card)}>{card.card_name}</button></h2>
        <div className="archive-price"><SiteIcon name="coin" /><strong>{(returnValues[card.rarity] ?? 0).toLocaleString()}</strong><span>pts / card</span></div>
      </article>;
    })}</div>
    {totalSelectedCount > 0 && <aside className="archive-sale-bar" aria-label="Selected cards"><div><strong>{totalSelectedCount} card{totalSelectedCount === 1 ? "" : "s"} selected</strong><span><SiteIcon name="coin" /> +{totalSellPoints.toLocaleString()} pts</span></div><button type="button" className="archive-clear" onClick={onClearSelection}>Clear</button><button type="button" className="site-primary" onClick={onReviewSale}>Review sale <SiteIcon name="arrow" /></button></aside>}
    <SoftDialog open={selectedCard !== null} onClose={() => setSelectedCard(null)} title={selectedCard?.card_name ?? "Select cards"}>
      {selectedCard && <><div className="archive-dialog-art"><CardFrame src={selectedCard.image} alt={selectedCard.card_name} rarity={selectedCard.rarity} /><button type="button" className="archive-zoom" aria-label={`Enlarge ${selectedCard.card_name}`} onClick={() => setZoomCard(selectedCard)}><SiteIcon name="search" /></button></div><span className="archive-owned-pill">Owned <strong>{selectedCard.count}</strong></span><p className="archive-quantity-label">How many would you like to sell?</p><div className="archive-stepper"><button type="button" className="archive-step-edge" onClick={() => changeDraft(0)} disabled={draftCount === 0} aria-label="Select none" title="Select none"><SiteIcon name="first" /></button><div className="archive-step-inner"><button type="button" onClick={() => changeDraft(draftCount - 1)} disabled={draftCount === 0} aria-label="Decrease quantity"><SiteIcon name="minus" /></button><input type="number" aria-label="Quantity to sell" min={0} max={selectedCard.count} value={draftCount} onChange={(event) => changeDraft(event.target.valueAsNumber)} /><button type="button" onClick={() => changeDraft(draftCount + 1)} disabled={draftCount === selectedCard.count} aria-label="Increase quantity"><SiteIcon name="plus" /></button></div><button type="button" className="archive-step-edge" onClick={() => changeDraft(selectedCard.count)} disabled={draftCount === selectedCard.count} aria-label="Select all owned copies" title="Select all"><SiteIcon name="last" /></button></div><div className="archive-dialog-action"><span><SiteIcon name="coin" /><strong>{(draftCount * (returnValues[selectedCard.rarity] ?? 0)).toLocaleString()}</strong><small>pts</small></span><button type="button" className="site-primary" onClick={() => { setSellCount(selectedCard.card_name, draftCount, selectedCard.count); setSelectedCard(null); }}>{draftCount ? "Select cards" : "Clear selection"}<SiteIcon name="check" /></button></div><p className="archive-dialog-note">You can review your selection before selling.</p></>}
    </SoftDialog>
    <SoftDialog open={zoomCard !== null} onClose={() => setZoomCard(null)} title={zoomCard ? `${zoomCard.card_name} · Card preview` : "Card preview"} wide>{zoomCard && <CardFrame src={zoomCard.image} alt={`${zoomCard.card_name} — full card`} rarity={zoomCard.rarity} inspection />}</SoftDialog>
  </div>;
}
