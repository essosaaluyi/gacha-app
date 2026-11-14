"use client";

import CroppedCardImage from "@/components/gacha/CroppedCardImage";
import { useState } from "react";
import Image from "next/image";
import { getPlayerCharacterName } from "@/lib/battle-pixi/config/characterNames";
import { cards } from "@/lib/gacha/pullLogic";
import OfferingRates from "@/components/gacha/OfferingRates";
import styles from "@/components/gacha/PackSelection.module.css";
type Props = { askPullConfirm: (count: 1 | 5) => void; costs: { five: number }; fiveUnavailableReason?: string };
export default function PullSelection({askPullConfirm,costs,fiveUnavailableReason}: Props) {
 const [ratesOpen,setRatesOpen]=useState(false);
 return <section className={styles.root} aria-label="Five-card pack">
  <header className={styles.heading}><p>DESTINY LEGENDS</p><h1>One pack. Five discoveries.</h1><span>5 cards in every pack</span></header>
  <div className={styles.showcase}>
   <div className={styles.strip} aria-label="Cards available in this pack">{cards.map(card=><div className={styles.stripCard} key={card.name}><CroppedCardImage src={card.image} alt={getPlayerCharacterName(card).label} /></div>)}</div>
   <div className={styles.pack}><Image src="/images/pack-isolated-legends-v1-r01.png" alt="Destiny Wars — Isolated Legends Volume 1 card pack" width={480} height={640} unoptimized priority /></div>
  </div>
  <div className={styles.actions}><div className={styles.price}><strong>{costs.five.toLocaleString()}</strong><span>points / pack · 5 cards</span></div>
   <button type="button" aria-label="Five pull" disabled={Boolean(fiveUnavailableReason)} aria-describedby={fiveUnavailableReason ? "five-pull-unavailable" : undefined} onClick={()=>askPullConfirm(5)} className={styles.open}>Open a pack <span aria-hidden="true">→</span></button>
   {fiveUnavailableReason && <p id="five-pull-unavailable" className={styles.notice}>{fiveUnavailableReason}</p>}
   <button type="button" className={styles.ratesButton} onClick={()=>setRatesOpen(true)}>ⓘ Offering Rates</button>
  </div><OfferingRates open={ratesOpen} onClose={()=>setRatesOpen(false)} />
 </section>;
}
