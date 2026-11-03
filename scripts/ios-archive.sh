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
  # Prefer the team that holds an App Store distribution certificate
  TEAM=$(security find-identity -v -p codesigning | grep 'Apple Distribution' | head -1 | sed -E 's/.*\(([A-Z0-9]+)\)".*/\1/')
  [ -z "$TEAM" ] && TEAM=$(security find-identity -v -p codesigning | grep 'Apple Development' | head -1 | sed -E 's/.*\(([A-Z0-9]+)\)".*/\1/')
fi
echo "signing team: ${TEAM:-NOT FOUND}"
if [ -z "$TEAM" ]; then echo "No Apple signing team found. Sign in to Xcode > Settings > Accounts, then run again."; exit 1; fi

# App Store Connect API key (optional): lets xcodebuild manage signing and upload without an Xcode sign-in.
#   sh ios-archive.sh upload <issuer-id>   with the key file AuthKey_<KEYID>.p8 in ~/Downloads
AUTH=()
KEYFILE=$(ls "$HOME"/Downloads/AuthKey_*.p8 2>/dev/null | head -1 || true)
if [ -n "$KEYFILE" ] && [ -n "$2" ]; then
  KEYID=$(basename "$KEYFILE" .p8); KEYID=${KEYID#AuthKey_}
  AUTH=(-authenticationKeyPath "$KEYFILE" -authenticationKeyID "$KEYID" -authenticationKeyIssuerID "$2")
  echo "using App Store Connect API key $KEYID"
fi

OUT="$HOME/silicon-hall-build"
rm -rf "$OUT" && mkdir -p "$OUT"
cd ios/App

if [ "$1" = "signed" ]; then
  # Archive signed with the App Store profile Xcode already created for this bundle id,
  # so the archive carries the team and can be distributed from Xcode's Organizer.
  PROFILE=""
  for f in "$HOME"/Library/Developer/Xcode/UserData/Provisioning\ Profiles/*.mobileprovision "$HOME"/Library/MobileDevice/Provisioning\ Profiles/*.mobileprovision; do
    [ -f "$f" ] || continue
    security cms -D -i "$f" > /tmp/prof.plist 2>/dev/null || continue
    APPID=$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' /tmp/prof.plist 2>/dev/null || true)
    DEVS=$(/usr/libexec/PlistBuddy -c 'Print :ProvisionedDevices' /tmp/prof.plist 2>/dev/null || true)
    case "$APPID" in *.com.siliconhall.museum) [ -z "$DEVS" ] && PROFILE=$(/usr/libexec/PlistBuddy -c 'Print :Name' /tmp/prof.plist);; esac
  done
  echo "store profile: ${PROFILE:-NOT FOUND}"
  [ -z "$PROFILE" ] && { echo "Run 'bash ios.sh' once first so Xcode creates the App Store profile."; exit 1; }
  python3 - "$PROFILE" <<'PY'
import sys,re
name=sys.argv[1]; p='App.xcodeproj/project.pbxproj'; s=open(p).read()
i=s.rfind('CODE_SIGN_STYLE = Automatic;')
s=s[:i]+'CODE_SIGN_STYLE = Manual;\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "%s";'%name+s[i+len('CODE_SIGN_STYLE = Automatic;'):]
open(p,'w').write(s); print('project patched for manual App Store signing')
PY
  xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
    -destination 'generic/platform=iOS' -archivePath "$OUT/App.xcarchive" \
    DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution" archive | tail -15
  echo "signed archive ok: $OUT/App.xcarchive"
  open "$OUT/App.xcarchive"
  echo "=== done (signed archive opened in Xcode Organizer)"
  exit 0
fi

# Archive unsigned; signing happens at export, where Xcode creates the App Store profile itself.
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$OUT/App.xcarchive" \
  DEVELOPMENT_TEAM="$TEAM" CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" archive | tail -15
echo "archive ok: $OUT/App.xcarchive"

DEST=export
[ "$1" = "upload" ] && DEST=upload
cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>$DEST</string>
<key>teamID</key><string>$TEAM</string>
<key>signingStyle</key><string>automatic</string>
<key>uploadSymbols</key><true/>
</dict></plist>
PLIST
xcodebuild -exportArchive -archivePath "$OUT/App.xcarchive" -exportOptionsPlist "$OUT/ExportOptions.plist" \
  -exportPath "$OUT/export" -allowProvisioningUpdates "${AUTH[@]}" | tail -30
ls -la "$OUT/export" 2>/dev/null || true
echo "=== done ($DEST)"
