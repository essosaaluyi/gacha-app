/** Unscaled 1920x1080 stage pixels; shared by the dock and Kai's deal motion. */
export const CABINET_PLAYER_DOCK_OUTLET = { x: 40, y: 604, width: 256, height: 100, border: 6 } as const;

/**
 * The slot a card actually comes out of, in the same stage pixels.
 *
 * Read off .throat and .lip in CabinetPlayerDock.module.css, both of which are
 * laid out against the outlet's padding box (the 6px border is transparent but
 * still there): the throat is the opening you can see into, and the lip is the
 * bar a card crosses on its way out. Anything of a card above y1 is inside the
 * machine and only shows through the x0..x1 column.
 */
export const CABINET_PLAYER_DOCK_MOUTH = { x0: 66, x1: 270, y0: 625, y1: 700 } as const;

/**
 * A card back at its own proportions.
 *
 * The art is 132x198, so a card is 2:3 and nothing may change that. It used to
 * be 168x120 here — a box sized to sit inside a 100px-tall mouth — which made
 * every dealt card start at 1.32:1 and stretch back to 0.67:1 over the whole
 * flight. The card is the right shape now and the mouth hides it instead.
 */
export const CABINET_PLAYER_DOCK_CARD = { width: 168, height: 252 } as const;

/**
 * Where the three waiting cards sit: half of each card inside the dispenser,
 * so the mouth cuts them across the middle. Stacked 20px deeper each, the one
 * in front highest and the ones behind stepping down, which is how three cards
 * in a slot read as three. They are never offset sideways — the stack is
 * straight, and the step alone separates them.
 */
export const CABINET_PLAYER_DOCK_BACK_RECTS = [0, 1, 2].map((index) => ({
  x: 84,
  y: CABINET_PLAYER_DOCK_MOUTH.y1 - CABINET_PLAYER_DOCK_CARD.height / 2 + index * 24,
  width: CABINET_PLAYER_DOCK_CARD.width,
  height: CABINET_PLAYER_DOCK_CARD.height,
})) as readonly { x: number; y: number; width: number; height: number }[];

/** Natural card art pitched out of the mouth, centred below the player dock.
 * The same projected corners are used by DRAW1 and the first DRAW2 frame. */
export const CABINET_PLAYER_DOCK_BACK_QUADS = CABINET_PLAYER_DOCK_BACK_RECTS.map(rect =>
  [rect.x+4,rect.y,rect.x+rect.width-4,rect.y,rect.x+rect.width,rect.y+rect.height,rect.x,rect.y+rect.height] as const);
