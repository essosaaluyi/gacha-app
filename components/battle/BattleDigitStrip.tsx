type DigitStyle = "crown-ledger" | "rift-fang" | "rune-led" | "jackpot-relic";

type BattleDigitStripProps = {
  value: number | string;
  style: DigitStyle;
  className?: string;
  minDigits?: number;
};

const digitRoot = "/images/battle-ui/production/v1/transparent/digits";

export default function BattleDigitStrip({
  value,
  style,
  className = "",
  minDigits = 0,
}: BattleDigitStripProps) {
  const digits = String(value).replace(/\D/g, "").padStart(minDigits, "0");

  return (
    <span className={`battle-digit-strip battle-digit-strip-${style} ${className}`} aria-hidden="true">
      {digits.split("").map((digit, index) => (
        <img
          key={`${digit}-${index}`}
          src={`${digitRoot}/${style}/${style}-digit-${digit}-v1.png`}
          alt=""
          draggable={false}
        />
      ))}
    </span>
  );
}
