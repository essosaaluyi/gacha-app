export type RevealCard = {
  name: string;
  rarity: string;
  image: string;
  backImage?: string;
};

export type RevealScene = {
  advance: (done: () => void) => void;
  tilt: (x: number, y: number) => void;
  dispose: () => void;
};
