import BattleScreen from "@/components/battle/BattleScreen";
import { Suspense } from "react";

export default function BattleSimPage() {
  return (
    <Suspense fallback={null}>
      <BattleScreen />
    </Suspense>
  );
}
