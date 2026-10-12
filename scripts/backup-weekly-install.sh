#!/bin/bash
# WB-E002: install the weekly backup — Sunday 02:00 local; macOS runs a missed run on wake. Scott runs this himself.
set -eu
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.panameer.weekly-backup"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DEST="$HOME/Panameer Backups"
NODE_DIR="$(dirname "$(command -v node)")"
mkdir -p "$DEST" "$HOME/Library/LaunchAgents"
chmod +x "$REPO/scripts/backup-weekly.sh"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$REPO/scripts/backup-weekly.sh</string></array>
  <key>EnvironmentVariables</key><dict><key>NODE_BIN_DIR</key><string>$NODE_DIR</string></dict>
  <key>StartCalendarInterval</key><dict><key>Weekday</key><integer>0</integer><key>Hour</key><integer>2</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$DEST/launchd.log</string>
  <key>StandardErrorPath</key><string>$DEST/launchd.log</string>
</dict>
</plist>
PLIST
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL — Sundays 02:00. Status: npm run backup:status. Remove: scripts/backup-weekly-uninstall.sh"
