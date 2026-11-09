"use client";
import Image from "next/image";
import { getPlayerCharacterName } from "@/lib/battle-pixi/config/characterNames";
import { getOfferingRates } from "@/lib/gacha/pullLogic";
import SoftDialog from "@/components/site/SoftDialog";
import styles from "./PackSelection.module.css";
export default function OfferingRates({open,onClose}:{open:boolean;onClose:()=>void}) {
 const rates=getOfferingRates();
 const percent=(value:number)=>value.toLocaleString("en",{maximumFractionDigits:6})+"%";
 return <SoftDialog open={open} onClose={onClose} title="Offering Rates" wide startAtTop><div className={styles.rates}>
 <button type="button" data-dialog-initial-focus className={styles.topClose} aria-label="Close offering rates" onClick={onClose}>×</button>
 <p className={styles.rateIntro}>Probability per card drawn. Each pack contains 5 cards. These are individual draw rates, not the chance of finding a card at least once in a pack.</p>
 {rates.map(group=><section key={group.rarity}><h3><span>{group.rarity} <small>· {group.cards.length} cards</small></span><strong>{percent(group.probability)}</strong></h3>{group.cards.map(card=><div className={styles.rateRow} key={card.name}><Image src={card.image} alt={getPlayerCharacterName(card).label} width={48} height={72} unoptimized /><span>{getPlayerCharacterName(card).displayName || card.name}<small>{card.name} · {card.rarity}</small></span><strong>{percent(card.probability)}</strong></div>)}</section>)}
 <p className={styles.rateIntro}>Cards within each rarity are selected equally. Displayed percentages may be rounded.</p></div></SoftDialog>;
}
