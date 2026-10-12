#!/bin/bash
# WB-E003: last runs + the dated folders kept.
DEST="$HOME/Panameer Backups"
echo "Last runs ($DEST/last-run.log):"
tail -5 "$DEST/last-run.log" 2>/dev/null || echo "  (no runs yet)"
echo; echo "Kept backups:"
for d in "$DEST"/*/; do n="$(basename "$d")"; [[ "$n" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}$ ]] && printf "  %s  %s\n" "$n" "$(du -sh "$d" | cut -f1)"; done
launchctl print "gui/$(id -u)/com.panameer.weekly-backup" >/dev/null 2>&1 && echo "Weekly job: installed (Sundays 02:00)" || echo "Weekly job: not installed (scripts/backup-weekly-install.sh)"
