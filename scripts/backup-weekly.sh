#!/bin/bash
# WB-E001: weekly backup (launchd, Sunday 02:00) — npm run backup, keep the 8 newest dated folders, log one line per run.
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/Panameer Backups"
LOG="$DEST/last-run.log"
KEEP=8
# launchd has a bare PATH: use NODE_BIN_DIR (set by the installer), else the newest nvm node, else Homebrew.
NODE_DIR="${NODE_BIN_DIR:-$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="${NODE_DIR:+$NODE_DIR:}/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p "$DEST"
is_dated() { [[ "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}$ ]]; }
dated() { for d in "$DEST"/*/; do n="$(basename "$d")"; is_dated "$n" && echo "$n"; done | sort; }

before="$(dated)"
cd "$REPO" || { echo "$(date '+%F %T') failed  repo not found" >> "$LOG"; exit 1; }
echo "=== $(date '+%F %T') weekly backup ==="
npm run backup
code=$?
folder="$(comm -13 <(echo "$before") <(dated) | tail -1)"
size="$( [ -n "$folder" ] && du -sh "$DEST/$folder" | cut -f1)"
if [ $code -ne 0 ]; then
  echo "$(date '+%F %T') failed  ${folder:-no folder} ${size:-} (exit $code)" >> "$LOG"
  exit $code
fi
# Prune: only folders named YYYY-MM-DD_HHMM, oldest first, until 8 remain. Nothing else is touched.
pruned=0
all=($(dated))
while [ ${#all[@]} -gt $KEEP ]; do
  rm -rf "$DEST/${all[0]}" && pruned=$((pruned + 1))
  all=("${all[@]:1}")
done
echo "$(date '+%F %T') ok      $folder $size (pruned $pruned, kept ${#all[@]})" >> "$LOG"
