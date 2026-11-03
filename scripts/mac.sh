#!/bin/bash
# Small helpers for the Mac build box. Usage: bash mac.sh <action>
export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH
case "$1" in
  ps)       ps -axo user,pid,stat,comm | grep -i xcode | grep -v grep ;;
  kill)     killall Xcode 2>/dev/null; sleep 2; killall -9 Xcode 2>/dev/null; echo "Xcode closed" ;;
  open)     open -a Xcode; echo opened ;;
  settings) open -a Xcode; sleep 6; osascript -e 'tell application "Xcode" to activate' -e 'delay 1' -e 'tell application "System Events" to keystroke "," using command down'; echo "settings requested" ;;
  keys)     ls -la "$HOME"/Downloads/AuthKey_*.p8 2>/dev/null || echo "no API key file in Downloads"; security find-identity -v -p codesigning ;;
  log)      tail -n 40 "$HOME/ios-build.log" ;;
  *)        echo "actions: ps kill open settings keys log" ;;
esac
