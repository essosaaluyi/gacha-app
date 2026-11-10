#!/usr/bin/env bash
# Builds comparison samples for Hayate's lag proposals 1, 6, 7 and 8.
# Reads production media only; every output goes to outputs/compression-samples/.
# Nothing under public/ is modified. Requires ffmpeg/ffprobe (winget Gyan.FFmpeg).
#
#   bash tools/make-compression-samples.sh            # all groups
#   bash tools/make-compression-samples.sh enemy      # one group: enemy|video|chance|points
set -u
cd "$(dirname "$0")/.."
FFB="${FFMPEG_BIN:-$LOCALAPPDATA/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin}"
FF="$FFB/ffmpeg"; FP="$FFB/ffprobe"
OUT=outputs/compression-samples
mkdir -p "$OUT"
REPORT="$OUT/report.tsv"
GROUP="${1:-all}"
want() { [ "$GROUP" = all ] || [ "$GROUP" = "$1" ]; }
bytes() { find "$@" -type f -printf '%s\n' 2>/dev/null | awk '{s+=$1} END {print s+0}'; }
row() { printf '%s\t%s\t%s\t%s\t%s\n' "$@" >> "$REPORT"; echo "$*"; }
# SSIM "All" value from an ffmpeg ssim filter run (stderr).
ssim_of() { grep -o 'All:[0-9.]*' | tail -1 | cut -d: -f2; }

[ -f "$REPORT" ] || printf 'group\tsample\toriginal_bytes\tsample_bytes\tssim_vs_original\n' > "$REPORT"

# --- 1: enemy idle PNG sequences -> VP9 WebM with alpha (same settings family as enemy-eight)
if want enemy; then
  for e in one two four six seven; do
    src=public/images/battle-characters/enemy-$e/idle
    dst="$OUT/enemy-$e-idle.crf30.webm"
    "$FF" -v error -y -framerate 25 -i "$src/%04d.png" -c:v libvpx-vp9 -pix_fmt yuva420p \
      -crf 30 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -auto-alt-ref 0 -an "$dst"
    # Colour SSIM over black, decoded with libvpx so the alpha plane is honoured.
    s=$("$FF" -v info -framerate 25 -i "$src/%04d.png" -c:v libvpx-vp9 -i "$dst" -filter_complex \
      "[0]format=rgba,premultiply=inplace=1,format=yuv420p[a];[1]format=rgba,premultiply=inplace=1,format=yuv420p[b];[a][b]ssim" \
      -f null - 2>&1 | ssim_of)
    row enemy "enemy-$e idle -> webm crf30" "$(bytes "$src")" "$(bytes "$dst")" "$s"
  done
fi

# --- 6: opening / reveal videos -> H.264 CRF 23 and 26, faststart
if want video; then
  for v in openings/battle-opening standard standard2 SSR gacha-reveal-UR1 gacha-reveal-UR2; do
    src=public/videos/$v.mp4
    name=$(basename "$v")
    "$FP" -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,bit_rate:format=duration,bit_rate \
      -of compact "$src" > "$OUT/$name.probe.txt"
    for crf in 23 26; do
      dst="$OUT/$name.crf$crf.mp4"
      "$FF" -v error -y -i "$src" -c:v libx264 -preset slow -crf $crf -pix_fmt yuv420p \
        -c:a copy -movflags +faststart "$dst"
      s=$("$FF" -v info -i "$src" -i "$dst" -filter_complex "[0:v][1:v]ssim" -f null - 2>&1 | ssim_of)
      row video "$name -> h264 crf$crf" "$(bytes "$src")" "$(bytes "$dst")" "$s"
    done
  done
fi

# --- 7: chance-reveal (UR3 background, card-blue foreground with alpha)
if want chance; then
  ur3=public/videos/chance-reveal/UR3
  blue=public/videos/chance-reveal/card-blue
  # Is the UR3 background actually opaque? (minimum alpha over the sequence)
  "$FF" -v error -framerate 30 -start_number 0 -i "$ur3/crv-bg-ur3%03d.png" -vf alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN \
    -f null - 2>&1 | grep -o 'YMIN=[0-9]*' | sort -t= -k2 -n | head -1 | sed 's/^/UR3 alpha minimum /' | tee "$OUT/ur3-alpha.txt"
  dst="$OUT/chance-UR3.crf23.mp4"
  "$FF" -v error -y -framerate 30 -start_number 0 -i "$ur3/crv-bg-ur3%03d.png" -c:v libx264 -preset slow -crf 23 \
    -pix_fmt yuv420p -movflags +faststart "$dst"
  s=$("$FF" -v info -framerate 30 -start_number 0 -i "$ur3/crv-bg-ur3%03d.png" -i "$dst" -filter_complex \
    "[0]format=yuv420p[a];[1]format=yuv420p[b];[a][b]ssim" -f null - 2>&1 | ssim_of)
  row chance "UR3 -> h264 crf23 mp4" "$(bytes "$ur3")" "$(bytes "$dst")" "$s"
  for q in 85 75; do
    d="$OUT/chance-card-blue-webp-q$q"; mkdir -p "$d"
    "$FF" -v error -y -start_number 0 -i "$blue/card-blue%03d.png" -c:v libwebp -quality $q \
      -pix_fmt yuva420p -start_number 0 "$d/card-blue%03d.webp"
    s=$("$FF" -v info -start_number 0 -i "$blue/card-blue%03d.png" -start_number 0 -i "$d/card-blue%03d.webp" -filter_complex \
      "[0]format=rgba,premultiply=inplace=1,format=yuv420p[a];[1]format=rgba,premultiply=inplace=1,format=yuv420p[b];[a][b]ssim" \
      -f null - 2>&1 | ssim_of)
    row chance "card-blue -> webp q$q (alpha)" "$(bytes "$blue")" "$(bytes "$d")" "$s"
  done
fi

# --- 8: points-gain PNG sequences -> per-frame WebP with alpha (one tier as the sample)
if want points; then
  src=public/videos/points-gain/20p
  for q in 85 75; do
    d="$OUT/points-gain-20p-webp-q$q"; mkdir -p "$d"
    "$FF" -v error -y -start_number 0 -i "$src/20p%03d.png" -c:v libwebp -quality $q \
      -pix_fmt yuva420p -start_number 0 "$d/20p%03d.webp"
    s=$("$FF" -v info -start_number 0 -i "$src/20p%03d.png" -start_number 0 -i "$d/20p%03d.webp" -filter_complex \
      "[0]format=rgba,premultiply=inplace=1,format=yuv420p[a];[1]format=rgba,premultiply=inplace=1,format=yuv420p[b];[a][b]ssim" \
      -f null - 2>&1 | ssim_of)
    row points "points-gain 20p -> webp q$q (alpha)" "$(bytes "$src")" "$(bytes "$d")" "$s"
  done
fi
echo "done -> $REPORT"
