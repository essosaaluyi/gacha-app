"use client";
import { setBattleState } from "@/lib/battle-pixi/state/battleStateStore";
import { revealCard } from "@/lib/battle-pixi/presentation/cardRevealSystem";
import { useEffect, useRef } from "react";
import {
  Application,
  Assets,
  Sprite,
  Container,
  Graphics,
  Text,
} from "pixi.js";

import { STAGE, UI } from "@/lib/battle-pixi/config";
import { PresentationContext } from "@/lib/battle-pixi/presentation/presentationContext";
import { drawBattleResult } from "@/lib/battle-pixi/core/resultLottery";
import { recordDrawOutcome } from "@/lib/battle-pixi/state/drawCostStore";
import {
  animateTo,
  animateTransformTo,
} from "@/lib/battle-pixi/presentation/animations";
import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
import { evaluateResult } from "@/lib/battle-pixi/core/evaluateResult";

import {
  getEnemyAttackCounter,
  setEnemyAttackCounter,
} from "@/lib/battle-pixi/state/enemyAttackCounterStore";

import { rollAttackAttempt } from "@/lib/battle-pixi/core/attackAttemptSystem";

import {
  getAttackFakeoutState,
  startAttackFakeout,
  consumeFakeoutTurn,
  overrideFakeoutToSuccess,
  clearAttackFakeout,
} from "@/lib/battle-pixi/state/attackFakeoutStore";

import {
  isFatalModeActive,
  startFatalMode,
  registerFatalModeHit,
  consumeFatalModeTurn,
} from "@/lib/battle-pixi/state/fatalModeStore";

import {
  isEnemyAttackModeActive,
  startEnemyAttackMode,
  registerPlayerCounter,
  registerEnemyAttackReset,
  consumeEnemyAttackModeTurn,
} from "@/lib/battle-pixi/state/enemyAttackModeStore";

import {
  selectEnemyForRound,
  loadNextRoundEnemy,
  getCurrentEnemy,
} from "@/lib/battle-pixi/state/currentEnemyStore";

import {
  getCurrentRound,
  nextRound,
} from "@/lib/battle-pixi/state/roundStore";

import { showRoundInsert } from "@/lib/battle-pixi/state/roundInsertStore";

import { resetBattleCardsToGroup } from "@/lib/battle-pixi/stage/resetBattleCardsToGroup";
import { attachBattleRevealHandlers } from "@/lib/battle-pixi/stage/attachBattleRevealHandlers";
import { handleBattleEnemyDefeated } from "@/lib/battle-pixi/stage/handleBattleEnemyDefeated";
import { handleDrawButtonPress } from "@/lib/battle-pixi/stage/handleDrawButtonPress";

import { playPendingBonusRevealVideo } from "@/lib/battle-pixi/state/bonusPresentationStore";
import { getBonusModeState } from "@/lib/battle-pixi/state/bonusModeStore";
import { initializePlayerBattleCards } from "@/lib/battle-pixi/state/playerBattleCardStore";
import {
  hideMagicCircle,
  startEmptyMagicCircleChance,
} from "@/lib/battle-pixi/state/magicCircleStore";
import { rollChanceIconOverlay } from "@/lib/battle-pixi/state/chanceIconOverlayStore";

import {
  loadNextPlayerBattleCard,
  getCurrentPlayerBattleCard,
  getRemainingPlayerBattleCards,
} from "@/lib/battle-pixi/state/playerBattleCardStore";
import {
  clearAttackFakeoutInserts,
  showEnemyAttackFakeoutInsert,
  showPlayerAttackFakeoutInsert,
} from "@/lib/battle-pixi/state/attackFakeoutInsertStore";

function formatRoundInsertText(round: number) {
  if (round <= 10) {
    return `ROUND ${String(round).padStart(2, "0")}`;
  }

  return `ROUND EXTRA ${round - 10}`;
}

function getRoundEnemyImage(enemyId: string | number) {
  return `/images/round-inserts/enemy${String(enemyId).replace(
    "enemy",
    ""
  )}-round.webp`;
}

export default function BattlePixiStage() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let app: Application | null = null;
    let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      if (!wrapperRef.current) return;
      initializePlayerBattleCards();

      app = new Application();

      await app.init({
        width: STAGE.WIDTH,
        height: STAGE.HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
      });

      wrapperRef.current.appendChild(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "auto";
      app.canvas.style.display = "block";

      const stage = new Container();
      app.stage.addChild(stage);

      const startingEnemy = selectEnemyForRound(1);
      setEnemyAttackCounter(startingEnemy.attackCounter);
      addBattleLog(`Round 1 Enemy: ${startingEnemy.name}`, "draw");
      showRoundInsert(
        formatRoundInsertText(1),
        startingEnemy.name,
        startingEnemy.attackCounter,
        getRoundEnemyImage(startingEnemy.id)
      );

      const tableTexture = await Assets.load("/images/card-table.webp");
      const holderTexture = await Assets.load("/images/card-holder.webp");
      const drawButtonTexture = await Assets.load("/images/draw-button.webp");
      const cardBackTexture = await Assets.load("/images/card-back.webp");

      const symbolTextures = {
        Attack: await Assets.load("/images/battle-symbols/attack.webp"),
        Defense: await Assets.load("/images/battle-symbols/defense.webp"),
        Coin: await Assets.load("/images/battle-symbols/coin.webp"),
        Reply: await Assets.load("/images/battle-symbols/reply.webp"),
        Bar: await Assets.load("/images/battle-symbols/bar.webp"),
        Chance: await Assets.load("/images/battle-symbols/chance.webp"),
        Empty: await Assets.load("/images/battle-symbols/empty.webp"),
      };

      const targetMarker = new Graphics();
      targetMarker.circle(0, 0, 22).stroke({ width: 5, color: 0xff0000 });
      targetMarker.visible = false;
      stage.addChild(targetMarker);

      let cardsAreOut = false;
      let cardsReleased = false;
      let revealedCount = 0;
      let autoPlayEnabled = false;
      let autoProgressBusy = false;

      const revealed = [false, false, false];

      let currentBattleResult = drawBattleResult();

      const setCurrentBattleResult = (result: typeof currentBattleResult) => {
        currentBattleResult = result;
      };

      const table = new Sprite(tableTexture);
      table.anchor.set(0.5);
      table.x = UI.TABLE_X;
      table.y = UI.TABLE_Y;
      table.scale.set(UI.TABLE_SCALE);
      stage.addChild(table);

      const cardGroup = new Container();
      cardGroup.visible = false;
      cardGroup.x = UI.CARD_START_X;
      cardGroup.y = UI.CARD_START_Y;
      stage.addChild(cardGroup);

      const card1 = new Sprite(cardBackTexture);
      const card2 = new Sprite(cardBackTexture);
      const card3 = new Sprite(cardBackTexture);
      const drawCards = [card1, card2, card3];

      drawCards.forEach((card) => {
        card.anchor.set(0.5);
        card.scale.set(UI.CARD_SCALE);
        card.rotation = UI.CARD_ROTATION;
        card.texture = cardBackTexture;
        card.visible = false;
        card.eventMode = "none";
        cardGroup.addChild(card);
      });

      const holder = new Sprite(holderTexture);
      PresentationContext.holder = holder;
      holder.anchor.set(0.5);
      holder.x = UI.HOLDER_X;
      holder.y = UI.HOLDER_Y;
      holder.scale.set(UI.HOLDER_SCALE);
      stage.addChild(holder);

      const drawButton = new Sprite(drawButtonTexture);
      drawButton.anchor.set(0.5);
      drawButton.x = UI.DRAW_BUTTON_X;
      drawButton.y = UI.DRAW_BUTTON_Y;
      drawButton.scale.set(UI.DRAW_BUTTON_SCALE);
      drawButton.tint = 0xffffff;
      drawButton.eventMode = "static";
      drawButton.cursor = "pointer";
      stage.addChild(drawButton);

      const setDrawButtonPressed = (pressed: boolean) => {
        drawButton.tint = 0xffffff;
        animateTransformTo(
          drawButton,
          {
            y: UI.DRAW_BUTTON_Y + (pressed ? 8 : 0),
            scale: UI.DRAW_BUTTON_SCALE * (pressed ? 0.92 : 1),
          },
          pressed ? 90 : 140,
          "out"
        );
      };

      const playButton = new Graphics();
      playButton
        .poly([0, -34, 54, 0, 0, 34])
        .fill(0xffd700);

      playButton.x = UI.TABLE_X + 500;
playButton.y = UI.TABLE_Y - 40;
      playButton.eventMode = "static";
      playButton.cursor = "pointer";
      stage.addChild(playButton);

      const autoText = new Text({
        text: "AUTO OFF",
        style: {
          fill: 0xffffff,
          fontSize: 24,
          fontWeight: "bold",
          stroke: {
            color: 0x000000,
            width: 4,
          },
        },
      });

      autoText.anchor.set(0.5);
      autoText.x = playButton.x + 28;
autoText.y = playButton.y + 72;
      autoText.eventMode = "static";
      autoText.cursor = "pointer";
      stage.addChild(autoText);

      const resetCardsToGroup = () => {
        resetBattleCardsToGroup({
          drawCards,
          cardGroup,
          cardBackTexture,
          revealed,
          setRevealedCount: (value) => {
            revealedCount = value;
          },
          setCardsReleased: (value) => {
            cardsReleased = value;
          },
        });
      };

      let pendingNextRound = false;
      let showRoundInsertOnNextDraw = false;

      const handleEnemyDefeated = () => {
        handleBattleEnemyDefeated({
          setPendingNextRound: (value) => {
            pendingNextRound = value;
          },
          setShowRoundInsertOnNextDraw: (value) => {
            showRoundInsertOnNextDraw = value;
          },
        });
      };

      const drawCardsFromHolder = () => {
        cardGroup.x = UI.CARD_START_X;
cardGroup.y = UI.CARD_START_Y;
        setTimeout(() => {
          card1.visible = true;
          card1.rotation = UI.CARD_ROTATION;
          animateTo(card1, UI.CARD_END_X - UI.CARD_START_X, 0, 250);
        }, 0);

        setTimeout(() => {
          card2.visible = true;
          card2.rotation = UI.CARD_ROTATION;
          animateTo(card2, UI.CARD_END_X - UI.CARD_START_X - 20, 0, 250);
        }, 160);

        setTimeout(() => {
          card3.visible = true;
          card3.rotation = UI.CARD_ROTATION;
          animateTo(card3, UI.CARD_END_X - UI.CARD_START_X - 40, 0, 250);
        }, 320);
      };

      const showCurrentRoundInsert = () => {
        const round = getCurrentRound();
        const enemy = getCurrentEnemy();

        if (!enemy) return;

        showRoundInsert(
          formatRoundInsertText(round),
          enemy.name,
          enemy.attackCounter,
          getRoundEnemyImage(enemy.id)
        );
      };

      const preparePendingNextRound = () => {
        if (!pendingNextRound) return false;

        pendingNextRound = false;

        nextRound();

        const round = getCurrentRound();
        const enemy = loadNextRoundEnemy(round);

        setEnemyAttackCounter(enemy.attackCounter);

        return true;
      };

      const finishBonusAndShowNextRound = () => {
        pendingNextRound = true;
        showRoundInsertOnNextDraw = false;

        if (preparePendingNextRound()) {
          showCurrentRoundInsert();
        }
      };

      const startNewDraw = () => {
        resetCardsToGroup();

        preparePendingNextRound();

        currentBattleResult = drawBattleResult();

        // v-Next patch: record outcome (prices the next draw + event log)
        recordDrawOutcome(currentBattleResult.result, {
          cards: currentBattleResult.cards,
          targetSlot: currentBattleResult.targetSlot,
        });

        if (currentBattleResult.result === "Empty") {
          startEmptyMagicCircleChance();
        } else {
          hideMagicCircle();
        }
        rollChanceIconOverlay(currentBattleResult.cards.includes("Chance"));

        const evaluation = evaluateResult(currentBattleResult);

        addBattleLog(
          `Draw / Target Slot: ${currentBattleResult.targetSlot + 1}`,
          "draw"
        );

        let shouldStopBattleEvaluation = false;

        const fakeoutTurn = consumeFakeoutTurn();

        if (fakeoutTurn) {
          const isFinalFakeout = fakeoutTurn.finished;

          if (!isFinalFakeout && fakeoutTurn.fakeoutNumber === 1) {
            showPlayerAttackFakeoutInsert({
              card: getCurrentPlayerBattleCard(),
              predeterminedSuccess: fakeoutTurn.predeterminedSuccess,
            });
          }

          if (!isFinalFakeout && fakeoutTurn.fakeoutNumber === 2) {
            showEnemyAttackFakeoutInsert({
              enemy: getCurrentEnemy(),
              predeterminedSuccess: fakeoutTurn.predeterminedSuccess,
            });
          }

          addBattleLog(`Fakeout ${fakeoutTurn.fakeoutNumber}`, "fakeout");
          addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);

          shouldStopBattleEvaluation = true;

          if (fakeoutTurn.finished) {
            if (fakeoutTurn.predeterminedSuccess) {
              addBattleLog("Attack Success Revealed!", "success");
              clearAttackFakeout();
              clearAttackFakeoutInserts();

              startFatalMode();
              addBattleLog("Player Fatal Mode Started!", "success");
            } else {
              addBattleLog("Attack Failed.", "fail");
              clearAttackFakeout();
              clearAttackFakeoutInserts();
            }
          }
        }

        const targetPositions = [
          { x: UI.SLOT1_X, y: UI.SLOT1_Y - 120 },
          { x: UI.SLOT2_X, y: UI.SLOT2_Y - 120 },
          { x: UI.SLOT3_X, y: UI.SLOT3_Y - 120 },
        ];

        targetMarker.x = targetPositions[currentBattleResult.targetSlot].x;
        targetMarker.y = targetPositions[currentBattleResult.targetSlot].y;
        targetMarker.visible = true;

        stage.setChildIndex(targetMarker, stage.children.length - 1);

        if (showRoundInsertOnNextDraw) {
          showRoundInsertOnNextDraw = false;

          showCurrentRoundInsert();
        }

        if (!shouldStopBattleEvaluation && isEnemyAttackModeActive()) {
          const playerCounter =
            evaluation.chanceAttack ||
            currentBattleResult.result === "Defense" ||
            currentBattleResult.result === "Bar";

          const resetEnemyAttack =
            evaluation.attackOnTarget ||
            currentBattleResult.result === "Reply";

          if (playerCounter) {
            registerPlayerCounter();
          }

          if (resetEnemyAttack) {
            registerEnemyAttackReset();
          }

          const enemyTurn = consumeEnemyAttackModeTurn();

          if (enemyTurn) {
            if (enemyTurn.turnNumber === 1) {
              addBattleLog("Enemy Fatal Mode Started!", "fail");
            }

            addBattleLog(
              `Enemy Fatal Mode Turn ${enemyTurn.turnNumber}`,
              "fail"
            );

            addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);

            shouldStopBattleEvaluation = true;

            if (enemyTurn.finished) {
              if (enemyTurn.playerCountered) {
                handleEnemyDefeated();
              } else if (enemyTurn.playerResetEnemyAttack) {
                addBattleLog("Enemy attack count reset.", "success");

                const currentEnemy = getCurrentEnemy();

                if (currentEnemy) {
                  setEnemyAttackCounter(currentEnemy.attackCounter);
                }
             } else {
  addBattleLog("Player Defeated!", "fail");
  clearAttackFakeout();

  const loadedNextCard = loadNextPlayerBattleCard();

  if (loadedNextCard) {
    addBattleLog(
      `Next Player Card Loaded. Remaining: ${getRemainingPlayerBattleCards()}`,
      "success"
    );

    setBattleState("playing");
  } else {
    addBattleLog("No player cards remaining.", "fail");
    setBattleState("playerDefeated");
  }
}
            }
          }
        }

        if (!shouldStopBattleEvaluation && isFatalModeActive()) {
          const fatalHit =
            evaluation.attackOnTarget ||
            evaluation.chanceAttack ||
            currentBattleResult.result === "Bar" ||
            currentBattleResult.result === "Reply" ||
            currentBattleResult.result === "Defense";

          if (fatalHit) {
            registerFatalModeHit();
          }

          const fatalTurn = consumeFatalModeTurn();

          if (fatalTurn) {
            addBattleLog(
              `Player Fatal Mode Turn ${fatalTurn.turnNumber}`,
              "fakeout"
            );

            addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);

            shouldStopBattleEvaluation = true;

            if (fatalTurn.finished) {
              if (fatalTurn.enemyDefeated) {
                handleEnemyDefeated();
              } else {
                addBattleLog("Enemy Survived!", "fail");
                startEnemyAttackMode();
              }
            }
          }
        }

        if (!shouldStopBattleEvaluation) {
          addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);

          let attackAttemptSuccess = false;

          if (evaluation.attackOnTarget) {
            addBattleLog("Attack Attempt!");

            const attackResult = rollAttackAttempt(100);
            attackAttemptSuccess = attackResult.success;
          }

          if (evaluation.chanceAttack) {
            addBattleLog(
              `Chance Drawn: ${evaluation.chanceAttackRate}% attack chance`,
              "chance"
            );

            addBattleLog("Attack Attempt!");

            const attackResult = rollAttackAttempt(evaluation.chanceAttackRate);
            attackAttemptSuccess = attackResult.success;
          }

          if (evaluation.attackAttempt) {
            const currentFakeout = getAttackFakeoutState();

            if (currentFakeout.active && attackAttemptSuccess) {
              addBattleLog("Success Override!", "success");
              overrideFakeoutToSuccess();
            } else {
              const enemyCounter = getEnemyAttackCounter();

              clearAttackFakeoutInserts();
              startAttackFakeout(attackAttemptSuccess, enemyCounter);

              addBattleLog(
                attackAttemptSuccess
                  ? "Attack predetermined: SUCCESS"
                  : "Attack predetermined: FAIL"
              );
            }
          }

          if (!evaluation.attackAttempt) {
            addBattleLog("No attack triggered.");
          }
        }

        drawCardsFromHolder();
      };

      const handleRevealComplete = () => {
        revealedCount += 1;

        if (revealedCount >= 3) {
          const bonusState = getBonusModeState();

          if (bonusState.active && bonusState.phase === "bonus") {
            playPendingBonusRevealVideo();
          }

          setTimeout(() => {
            cardsAreOut = false;
            drawButton.eventMode = "static";
            drawButton.alpha = 1;
          }, 500);
        }
      };

      const attachRevealHandlers = () => {
        attachBattleRevealHandlers({
          cards: drawCards,
          revealed,
          currentCards: currentBattleResult.cards,
          symbolTextures,
          onRevealComplete: handleRevealComplete,
        });
      };

      const releaseCardsToTable = () => {
        if (!cardsAreOut || cardsReleased) return;

        cardsReleased = true;
        cardGroup.eventMode = "none";

        drawCards.forEach((card) => {
  const globalX = cardGroup.x + card.x;
const globalY = cardGroup.y + card.y;

  cardGroup.removeChild(card);
  stage.addChild(card);

  card.x = globalX;
  card.y = globalY;
});

        cardGroup.visible = false;

        animateTransformTo(
          card1,
          {
            x: UI.SLOT1_X,
            y: UI.SLOT1_Y,
            rotation: 0,
            scale: UI.CARD_SCALE,
          },
          UI.CARD_PLACE_DURATION_1,
          "out"
        );
        animateTransformTo(
          card2,
          {
            x: UI.SLOT2_X,
            y: UI.SLOT2_Y,
            rotation: 0,
            scale: UI.CARD_SCALE,
          },
          UI.CARD_PLACE_DURATION_2,
          "out"
        );
        animateTransformTo(
          card3,
          {
            x: UI.SLOT3_X,
            y: UI.SLOT3_Y,
            rotation: 0,
            scale: UI.CARD_SCALE,
          },
          UI.CARD_PLACE_DURATION_3,
          "out"
        );

        card1.eventMode = "static";
        card2.eventMode = "static";
        card3.eventMode = "static";

        attachRevealHandlers();
      };

      const autoProgressOnce = () => {
  if (autoProgressBusy) return;
  if (cardsAreOut) return;
  if (getBonusModeState().waitingForResultConfirm) return;

  autoProgressBusy = true;

  handleDrawButtonPress({
    cardsAreOut,
    setCardsAreOut: (value) => {
      cardsAreOut = value;
    },

    drawButton,
    drawCards,
    stage,

    startNewDraw,
    preparePendingNextRound,

    resetCardsToGroup,
    drawCardsFromHolder,
    setCurrentBattleResult,

    onBonusFinished: () => {
      finishBonusAndShowNextRound();
    },
  });

  setTimeout(() => {
    releaseCardsToTable();

    setTimeout(() => {
      revealCard({
        card: card1,
        cardIndex: 0,
        revealed,
        currentCards: currentBattleResult.cards,
        symbolTextures,
        onRevealComplete: handleRevealComplete,
      });

      setTimeout(() => {
        revealCard({
          card: card2,
          cardIndex: 1,
          revealed,
          currentCards: currentBattleResult.cards,
          symbolTextures,
          onRevealComplete: handleRevealComplete,
        });

        setTimeout(() => {
          revealCard({
            card: card3,
            cardIndex: 2,
            revealed,
            currentCards: currentBattleResult.cards,
            symbolTextures,
            onRevealComplete: handleRevealComplete,
          });

          setTimeout(() => {
            autoProgressBusy = false;
          }, 1300);
        }, 350);
      }, 350);
    }, 700);
  }, 1300);
};

      drawButton.on("pointertap", () => {
        setDrawButtonPressed(false);
        handleDrawButtonPress({
          cardsAreOut,
          setCardsAreOut: (value) => {
            cardsAreOut = value;
          },

          drawButton,
          drawCards,
          stage,

          startNewDraw,
          preparePendingNextRound,

          resetCardsToGroup,
          drawCardsFromHolder,
          setCurrentBattleResult,

          onBonusFinished: () => {
            finishBonusAndShowNextRound();
          },
        });
      });

      drawButton.on("pointerdown", () => {
        setDrawButtonPressed(true);
      });

      drawButton.on("pointerup", () => {
        setDrawButtonPressed(false);
      });

      drawButton.on("pointerupoutside", () => {
        setDrawButtonPressed(false);
      });

      drawButton.on("pointercancel", () => {
        setDrawButtonPressed(false);
      });

      playButton.on("pointertap", () => {
        autoProgressOnce();
      });

      autoText.on("pointertap", () => {
        autoPlayEnabled = !autoPlayEnabled;

        autoText.text = autoPlayEnabled ? "AUTO ON" : "AUTO OFF";

        if (autoPlayTimer) {
          clearInterval(autoPlayTimer);
          autoPlayTimer = null;
        }

        if (autoPlayEnabled) {
          autoPlayTimer = setInterval(() => {
            autoProgressOnce();
          }, 1000);
        }
      });

      let draggingCards = false;
      let dragOffsetX = 0;

      cardGroup.on("pointerdown", (event) => {
        if (!cardsAreOut || cardsReleased) return;

        draggingCards = true;
        dragOffsetX = event.global.x - cardGroup.x;
        cardGroup.cursor = "grabbing";
        cardGroup.alpha = 0.85;
      });

      cardGroup.on("pointerup", () => {
        if (!draggingCards) return;

        draggingCards = false;
        cardGroup.cursor = "grab";
        cardGroup.alpha = 1;

        const draggedDistance = cardGroup.x - UI.CARD_START_X;

        if (draggedDistance >= UI.RELEASE_DISTANCE) {
          releaseCardsToTable();
        } else {
          animateTo(cardGroup, UI.CARD_START_X, UI.CARD_START_Y, 200);
        }
      });

      cardGroup.on("pointerupoutside", () => {
        draggingCards = false;
        cardGroup.cursor = "grab";
        cardGroup.alpha = 1;

        if (!cardsReleased) {
          cardGroup.x = UI.CARD_START_X;
cardGroup.y = UI.CARD_START_Y;
          animateTo(cardGroup, UI.CARD_START_X, UI.CARD_START_Y, 200);
        }
      });

      cardGroup.on("globalpointermove", (event) => {
        if (!draggingCards) return;

        cardGroup.x = event.global.x - dragOffsetX;
        cardGroup.y = UI.CARD_START_Y;
      });
    };

    init();

    return () => {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }

      if (app) {
        try {
          app.destroy(false);
        } catch (error) {
          console.warn("Pixi cleanup warning:", error);
        }

        app = null;
      }
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="w-full flex items-center justify-center"
    />
  );
}
