import { getCardDisplayCrop, getCardDisplayFrame } from "@/components/gacha/pack-reveal/cardDisplayCrop";

type Props = {
  src: string;
  alt: string;
  inspection?: boolean;
};

const UNCROPPED = { left: 0, top: 0, right: 0, bottom: 0 };

/** Shared display crop for final fronts and inspection. The asset URL is unchanged. */
export default function CroppedCardImage({ src, alt, inspection = false }: Props) {
  const crop = getCardDisplayCrop(src) ?? UNCROPPED;
  const width = 1 - crop.left - crop.right;
  const height = 1 - crop.top - crop.bottom;
  const frame = getCardDisplayFrame(src);

  return (
    <span
      data-testid="cropped-card-image"
      className="pointer-events-none"
      style={{
        display: "block", position: "relative", overflow: "hidden", clipPath: frame.clipPath,
        width: inspection ? `min(100%, calc((100dvh - 200px) * ${frame.aspectRatio}))` : "100%",
        height: inspection ? "auto" : "100%",
        aspectRatio: frame.aspectRatio, margin: "0 auto",
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          display: "block", position: "absolute", maxWidth: "none",
          // Consumer thumbnail themes must not independently scale/shadow the art.
          transform: "none", filter: "none",
          width: `${100 / width}%`, height: `${100 / height}%`,
          left: `${-100 * crop.left / width}%`, top: `${-100 * crop.top / height}%`,
        }}
      />
    </span>
  );
}
