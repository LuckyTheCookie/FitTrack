#!/usr/bin/env bash
set -e

# ==================================================
# 🔨 FitTrack F-Droid Prebuild Script
# Flavor: FOSS (com.fittrack.app.foss)
# ==================================================

echo "=================================================="
echo "🚀 Starting F-Droid Prebuild Process"
echo "=================================================="

# 1. Environment Setup
if [ -z "$SOURCE_DATE_EPOCH" ]; then
    export SOURCE_DATE_EPOCH=$(date +%s)
fi
export EXPO_PUBLIC_BUILD_FLAVOR=foss
ROOT_DIR="$(pwd)"

# 2. Configure app.json for FOSS Package
echo "📝 Configuring app.json for F-Droid build..."
node -e "
const fs = require('fs');
const appJsonPath = '$ROOT_DIR/app.json';
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

appJson.expo.extra = appJson.expo.extra || {};
appJson.expo.extra.buildFlavor = 'foss';

if (appJson.expo.android && appJson.expo.android.googleServicesFile) {
  delete appJson.expo.android.googleServicesFile;
}

const fossPackage = 'com.fittrack.app.foss';
appJson.expo.android.package = fossPackage;
appJson.expo.ios.bundleIdentifier = 'com.fittrack.app';

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log('✅ app.json updated with package: ' + fossPackage);
"

# ==================================================
# 📦 FOSS DEPENDENCIES: Use FOSS Vision Camera Fork
# ==================================================
echo ""
echo "📦 Patching package.json to use FOSS Vision Camera fork..."
node -e "
const fs = require('fs');
const packageJsonPath = '$ROOT_DIR/package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const fossVisionCamera = 'github:LuckyTheCookie/react-native-vision-camera-foss';
if (packageJson.dependencies && packageJson.dependencies['react-native-vision-camera']) {
  const originalVersion = packageJson.dependencies['react-native-vision-camera'];
  packageJson.dependencies['react-native-vision-camera'] = fossVisionCamera;
  console.log('✅ react-native-vision-camera: ' + originalVersion + ' → ' + fossVisionCamera);
} else {
  console.log('⚠️  react-native-vision-camera not found in dependencies');
}

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
"

# 3. Install dependencies & Generate Native Code
echo ""
echo "📦 Installing dependencies (with FOSS Vision Camera)..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
fi
bun install --force

echo "🔧 Running Expo prebuild (Clean & Generate Android)..."
bunx expo prebuild --clean --platform android

# 4. Patching Native Files (Dynamic Path Finding)
echo ""
echo "🏥 Patching Health Connect configuration..."
ANDROID_MAIN_DIR="android/app/src/main"
PATCHES_DIR="scripts/android-patches"

MAIN_ACTIVITY_PATH=$(find "$ANDROID_MAIN_DIR/java" -name "MainActivity.kt" | head -n 1)

if [ -f "$MAIN_ACTIVITY_PATH" ]; then
  echo "  📍 Found MainActivity at: $MAIN_ACTIVITY_PATH"
  CURRENT_PACKAGE_LINE=$(grep "^package " "$MAIN_ACTIVITY_PATH")
  
  if [ -f "$PATCHES_DIR/MainActivity.kt.patch" ]; then
    cp "$PATCHES_DIR/MainActivity.kt.patch" "$MAIN_ACTIVITY_PATH"
    sed -i "s/^package .*/$CURRENT_PACKAGE_LINE/" "$MAIN_ACTIVITY_PATH"
    echo "  ✅ MainActivity.kt patched successfully"
  fi
else
  echo "  ⚠️  MainActivity.kt NOT FOUND - Prebuild might have failed"
  exit 1
fi

DEST_DIR=$(dirname "$MAIN_ACTIVITY_PATH")
if [ -f "$PATCHES_DIR/PermissionsRationaleActivity.kt" ]; then
  cp "$PATCHES_DIR/PermissionsRationaleActivity.kt" "$DEST_DIR/PermissionsRationaleActivity.kt"
  CURRENT_PACKAGE_NAME=$(echo "$CURRENT_PACKAGE_LINE" | sed 's/package //;s/;//')
  sed -i "s/^package .*/package $CURRENT_PACKAGE_NAME/" "$DEST_DIR/PermissionsRationaleActivity.kt"
  echo "  ✅ PermissionsRationaleActivity.kt copied and package updated"
fi

# 5. Patch AndroidManifest
MANIFEST_PATH="$ANDROID_MAIN_DIR/AndroidManifest.xml"
if [ -f "scripts/patch-health-connect.js" ]; then
  node "scripts/patch-health-connect.js" "$MANIFEST_PATH"
  echo "  ✅ AndroidManifest.xml patched via script"
fi

# 6. Cleanup Google Services from Gradle
echo ""
echo "🧹 Cleaning up Google Services references..."
if [ -f "android/build.gradle" ]; then
  sed -i "/com\.google\.gms:google-services/d" "android/build.gradle"
fi
if [ -f "android/app/build.gradle" ]; then
  sed -i "/apply plugin: 'com\.google\.gms\.google-services'/d" "android/app/build.gradle"
fi
rm -f "android/app/google-services.json"

# 7. Patching Gradle for F-Droid Compliance
echo ""
echo "🔧 Patching Gradle for F-Droid Compliance..."

cat >> android/build.gradle <<EOF

// F-Droid Patch: Global Exclusion of Proprietary Libraries
allprojects {
    configurations.all {
        exclude group: 'com.google.firebase'
        exclude group: 'com.google.android.gms'
        exclude group: 'com.android.installreferrer'
        exclude group: 'com.google.mlkit'
    }
}
EOF

cat >> android/app/build.gradle <<EOF

// F-Droid Patch: Disable dependency metadata
android {
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
}
EOF

echo "  ✅ Gradle patched for F-Droid compliance"

# ==================================================
# 🔧 PATCH: Fix MediaPipe dependency on Vision Camera
# ==================================================
echo ""
echo "🔧 Fixing Vision Camera module resolution for MediaPipe..."

# 1. Patch MediaPipe's build.gradle
MEDIAPIPE_BUILD_GRADLE="node_modules/react-native-mediapipe-posedetection/android/build.gradle"
if [ -f "$MEDIAPIPE_BUILD_GRADLE" ]; then
    sed -i "s|project(':react-native-vision-camera')|project(path: ':react-native-vision-camera', configuration: 'default')|g" "$MEDIAPIPE_BUILD_GRADLE"
    echo "  ✅ MediaPipe build.gradle patched"
else
    echo "  ⚠️  MediaPipe build.gradle not found"
fi

# 2. Register Vision Camera in settings.gradle (CRITICAL!)
SETTINGS_GRADLE="android/settings.gradle"
if [ -f "$SETTINGS_GRADLE" ]; then
    if ! grep -q "react-native-vision-camera" "$SETTINGS_GRADLE"; then
        echo "  🔧 Adding Vision Camera to settings.gradle..."
        
        cat >> "$SETTINGS_GRADLE" <<EOF

// Vision Camera module (FOSS fork)
include ':react-native-vision-camera'
project(':react-native-vision-camera').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-vision-camera/android')
EOF
        echo "  ✅ Vision Camera registered in settings.gradle"
    else
        echo "  ℹ️  Vision Camera already in settings.gradle"
    fi
else
    echo "  ⚠️  settings.gradle not found!"
fi

echo "  ✅ Vision Camera module resolution fixed"

# 8. Dummy build.gradle for F-Droid Cleaner
rm -f settings.gradle
touch settings.gradle
cat > build.gradle <<EOF
task clean {
    doLast {
        println "Clean dummy task executed"
    }
}
EOF

echo ""
echo "✅✅ F-Droid prebuild phase COMPLETED successfully."
