"use client";

// Generic SVG line chart (stock-ticker style). No chart library —
// one polyline + gradient area, themable via CSS variables.

type ChartPoint = { x: number; y: number };

type LineChartProps = {
  points: ChartPoint[];
  width?: number;
  height?: number;
  stroke?: string;
  fillTop?: string;
  showLastDot?: boolean;
  xLabel?: string;
  yLabel?: string;
  /** Slump-graph mode: always include 0 in the Y domain and draw a solid zero baseline. */
  zeroLine?: boolean;
  /**
   * Snap the Y domain to stepped bounds (per side, symmetric around 0 is not
   * required). Minimum magnitude is one step; the domain grows one step at a
   * time as the line passes each threshold. e.g. step 500 → ±500, then +1000
   * once the line passes +500, etc. Gridlines are drawn at every step.
   */
  stepUnit?: number;
};

const PAD = { top: 14, right: 16, bottom: 22, left: 44 };

export default function LineChart({
  points,
  width = 320,
  height = 180,
  stroke = "var(--chart-line, #38bdf8)",
  fillTop = "var(--chart-fill, rgba(56, 189, 248, 0.28))",
  showLastDot = true,
  xLabel,
  yLabel,
  zeroLine = false,
  stepUnit,
}: LineChartProps) {
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  if (points.length < 2) {
    return (
      <svg width={width} height={height} role="img" aria-label="chart">
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="rgba(226, 232, 240, 0.55)"
          fontSize="12"
        >
          Play a few games to see the graph
        </text>
      </svg>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = zeroLine ? [...points.map((p) => p.y), 0] : points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const rawMinY = Math.min(...ys);
  const rawMaxY = Math.max(...ys);

  // Stepped Y domain: minimum one step each side, expanding a step at a time
  // as the line crosses each threshold (traditional slump-graph scaling).
  let minY = rawMinY;
  let maxY = rawMaxY;
  let gridValues: number[] = [rawMinY, (rawMinY + rawMaxY) / 2, rawMaxY];

  if (stepUnit && stepUnit > 0) {
    maxY = Math.max(stepUnit, Math.ceil(Math.max(rawMaxY, 0) / stepUnit) * stepUnit);
    minY = Math.min(-stepUnit, Math.floor(Math.min(rawMinY, 0) / stepUnit) * stepUnit);

    gridValues = [];
    for (let value = minY; value <= maxY + 0.5; value += stepUnit) {
      gridValues.push(value);
    }
  }

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const toSvg = (p: ChartPoint) => ({
    x: PAD.left + ((p.x - minX) / spanX) * innerW,
    y: PAD.top + (1 - (p.y - minY) / spanY) * innerH,
  });

  const svgPoints = points.map(toSvg);
  const polyline = svgPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const areaPath = [
    `M ${svgPoints[0].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)}`,
    ...svgPoints.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${svgPoints[svgPoints.length - 1].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)}`,
    "Z",
  ].join(" ");

  const last = svgPoints[svgPoints.length - 1];
  const lastValue = points[points.length - 1].y;
  const rising = points[points.length - 1].y >= points[0].y;
  const gradientId = `chart-area-${width}x${height}`;

  return (
    <svg width={width} height={height} role="img" aria-label="points graph">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillTop} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* horizontal grid lines with value labels */}
      {gridValues.map((value, index) => {
        const y = PAD.top + (1 - (value - minY) / spanY) * innerH;
        const isZero = Math.abs(value) < 0.5;
        return (
          <g key={index}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + innerW}
              y2={y}
              stroke={
                isZero
                  ? "rgba(226, 232, 240, 0.4)"
                  : "rgba(148, 163, 184, 0.16)"
              }
              strokeDasharray={isZero ? undefined : "3 5"}
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fill="rgba(226, 232, 240, 0.6)"
              fontSize="10"
            >
              {Math.round(value).toLocaleString()}
            </text>
          </g>
        );
      })}

      {zeroLine && !stepUnit && (
        <line
          x1={PAD.left}
          y1={PAD.top + (1 - (0 - minY) / spanY) * innerH}
          x2={PAD.left + innerW}
          y2={PAD.top + (1 - (0 - minY) / spanY) * innerH}
          stroke="rgba(226, 232, 240, 0.55)"
          strokeWidth="1.5"
        />
      )}

      <path d={areaPath} fill={`url(#${gradientId})`} />

      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {showLastDot && (
        <g>
          <circle cx={last.x} cy={last.y} r="4" fill={stroke} />
          <circle cx={last.x} cy={last.y} r="8" fill={stroke} opacity="0.25">
            <animate
              attributeName="r"
              values="5;10;5"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
          <text
            x={Math.min(last.x + 8, width - PAD.right)}
            y={last.y - 8}
            fill={rising ? "#4ade80" : "#f87171"}
            fontSize="11"
            fontWeight="700"
          >
            {lastValue.toLocaleString()}
          </text>
        </g>
      )}

      {xLabel && (
        <text
          x={PAD.left + innerW / 2}
          y={height - 4}
          textAnchor="middle"
          fill="rgba(226, 232, 240, 0.5)"
          fontSize="10"
        >
          {xLabel}
        </text>
      )}

      {yLabel && (
        <text
          x={10}
          y={PAD.top - 2}
          fill="rgba(226, 232, 240, 0.5)"
          fontSize="10"
        >
          {yLabel}
        </text>
      )}
    </svg>
  );
}
