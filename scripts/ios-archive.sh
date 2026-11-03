#!/bin/bash
# Build the Silicon Hall iOS app on a Mac with Xcode, and optionally upload it to App Store Connect.
#   sh ios-archive.sh            -> fetch code, build the web app, archive the iOS app
#   sh ios-archive.sh upload     -> same, then upload the archive to App Store Connect
# Output is also written to ~/ios-build.log
export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH
exec > >(tee -a "$HOME/ios-build.log") 2>&1
set -e -o pipefail
echo "=== $(date) start ($1)"
cd "$HOME"
rm -rf silicon-hall
git clone -q -b main https://github.com/speedwayridersnyc-gif/FiberX.git silicon-hall
cd silicon-hall
git log -1 --format='code: %h %s'
npm ci --no-audit --no-fund --loglevel=error
npm run build:static
npx cap sync ios

TEAM="$IOS_TEAM"
if [ -z "$TEAM" ]; then
  TEAM=$(security find-identity -v -p codesigning | grep -E 'Apple (Distribution|Development)' | head -1 | sed -E 's/.*\(([A-Z0-9]+)\)".*/\1/')
fi
echo "signing team: ${TEAM:-NOT FOUND}"
if [ -z "$TEAM" ]; then echo "No Apple signing team found. Sign in to Xcode > Settings > Accounts, then run again."; exit 1; fi

OUT="$HOME/silicon-hall-build"
rm -rf "$OUT" && mkdir -p "$OUT"
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$OUT/App.xcarchive" \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic archive | tail -30
echo "archive ok: $OUT/App.xcarchive"

if [ "$1" = "upload" ]; then
  cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>upload</string>
<key>teamID</key><string>$TEAM</string>
<key>signingStyle</key><string>automatic</string>
<key>uploadSymbols</key><true/>
</dict></plist>
PLIST
  xcodebuild -exportArchive -archivePath "$OUT/App.xcarchive" -exportOptionsPlist "$OUT/ExportOptions.plist" \
    -exportPath "$OUT/export" -allowProvisioningUpdates | tail -30
  echo "upload finished"
fi
echo "=== done"
