let visible = false;

let roundText = "";
let enemyName = "";
let attackCount = 0;
let roundImage = "";

let listeners: (() => void)[] = [];

export function showRoundInsert(
  round: string,
  enemy: string,
  ac: number,
  image = ""
) {
  visible = true;
  roundText = round;
  enemyName = enemy;
  attackCount = ac;
  roundImage = image;

  listeners.forEach((listener) => listener());
}

export function hideRoundInsert() {
  visible = false;

  listeners.forEach((listener) => listener());
}

export function getRoundInsertState() {
  return {
    visible,
    roundText,
    enemyName,
    attackCount,
    roundImage,
  };
}

export function subscribeRoundInsert(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}