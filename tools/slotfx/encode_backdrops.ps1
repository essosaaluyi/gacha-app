# PROVISIONAL — backdrops for the slot-style layer (see components/battle/slotfx).
#
# Cuts short seamless loops out of the owner's Envato footage and encodes them
# as small H.264 mp4 (plays in Safari). The footage itself stays in Downloads;
# it is licensed stock, not project source.
#
#   powershell -File tools/slotfx/encode_backdrops.ps1 [-Only name]
#
# A loop is made by cross-fading the end of the cut back into its beginning.

param([string]$Only = "")

$src = "$env:USERPROFILE\Downloads"
$out = Join-Path $PSScriptRoot "..\..\public\videos\battle-assets\slotfx"
New-Item -ItemType Directory -Force $out | Out-Null

# name, file, start (s), loop length (s), fade (s; 0 = plain cut), extra filter
$jobs = @(
  @("slotfx-bg-red-tunnel.v1",   "abstract-fiery-warp-speed-tunnel-background-2026-01-28-04-26-03-utc.mov", 2, 4, 0.6, "eq=saturation=1.15:contrast=1.08,hue=h=-14"),
  @("slotfx-bg-red-burst.v1",    "fast-speed-vortex-tunnel-2026-01-28-03-06-05-utc.mov", 2, 4, 0.6, ""),
  # The same two cuts turned blue, for moments that must not look hot (the judge).
  @("slotfx-bg-blue-tunnel.v1",  "abstract-fiery-warp-speed-tunnel-background-2026-01-28-04-26-03-utc.mov", 2, 4, 0.6, "colorchannelmixer=rr=0:rb=1:br=1:bb=0"),
  @("slotfx-bg-blue-burst.v1",   "fast-speed-vortex-tunnel-2026-01-28-03-06-05-utc.mov", 2, 4, 0.6, "colorchannelmixer=rr=0:rg=1:rb=0:gr=0.35:gg=0.65:gb=0:br=1:bg=0:bb=0.5"),
  @("slotfx-bg-rainbow-rays.v1", "light-rays-vj-loop-v3-2026-01-28-04-47-46-utc.mov", 2, 4, 0.6, ""),
  @("slotfx-bg-gold-burst.v1",   "51_bG9vb3BfNA.mov", 1, 4, 0.6, ""),
  @("slotfx-bg-violet-lines.v1", "30_aHlwZXJfMQ.mov", 1, 4, 0.6, ""),
  @("slotfx-speedlines.v1",      "abstract-radial-speed-lines-hyperspace-effect-2026-01-28-03-40-08-utc.mov", 1, 3, 0.5, ""),
  @("slotfx-glass-shatter.v1",   "dark-glass-shards-explosion-logo-reveal-2026-01-28-02-50-33-utc.mp4", 0, 2.4, 0, "")
)

foreach ($job in $jobs) {
  $name, $file, $start, $len, $fade, $extra = $job
  if ($Only -and $name -notlike "*$Only*") { continue }
  $in = Join-Path $src $file
  $look = "scale=960:540:flags=lanczos,fps=30" + $(if ($extra) { ",$extra" } else { "" })
  if ($fade -gt 0) {
    $graph = "[0:v]$look,split[x][y];" +
      "[x]trim=${fade}:$($len + $fade),setpts=PTS-STARTPTS[a];" +
      "[y]trim=0:${fade},setpts=PTS-STARTPTS[b];" +
      "[a][b]xfade=transition=fade:duration=${fade}:offset=$($len - $fade),format=yuv420p[v]"
  } else {
    $graph = "[0:v]$look,format=yuv420p[v]"
  }
  & ffmpeg -v error -y -ss $start -t ($len + $fade + 0.2) -i $in -filter_complex $graph -map "[v]" -t $len `
    -an -c:v libx264 -profile:v high -preset slow -crf 27 -movflags +faststart (Join-Path $out "$name.mp4")
  $item = Get-Item (Join-Path $out "$name.mp4")
  "{0}  {1:N2} MB" -f $item.Name, ($item.Length / 1MB)
}
