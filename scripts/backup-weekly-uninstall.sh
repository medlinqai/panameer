#!/bin/bash
# WB-E002: remove the weekly backup job. Backups already made are left alone.
LABEL="com.panameer.weekly-backup"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
echo "Removed $LABEL. Backups in ~/Panameer Backups are untouched."
