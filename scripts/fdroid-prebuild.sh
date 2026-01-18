#!/usr/bin/env bash
set -e

# ==================================================
# 🔨 FitTrack F-Droid Prebuild Script
# Flavor: FOSS (com.fittrack.app.foss)
# Version: NO FIREBASE - NO STUBS
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

// CRITICAL: Remove expo-notifications and expo-application plugins
if (appJson.expo.plugins) {
  const originalPlugins = appJson.expo.plugins.length;
  appJson.expo.plugins = appJson.expo.plugins.filter(plugin => {
    // Handle string plugins
    if (typeof plugin === 'string') {
      return plugin !== 'expo-notifications' && plugin !== 'expo-application';
    }
    // Handle array plugins [pluginName, options]
    if (Array.isArray(plugin)) {
      return plugin[0] !== 'expo-notifications' && plugin[0] !== 'expo-application';
    }
    return true;
  });
  
  const removed = originalPlugins - appJson.expo.plugins.length;
  if (removed > 0) {
    console.log('✅ Removed ' + removed + ' Firebase-related plugin(s) from app.json');
  }
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log('✅ app.json configured for FOSS build (package: ' + fossPackage + ')');
"

# ==================================================
# 📦 FOSS DEPENDENCIES
# ==================================================
echo ""
echo "📦 Patching dependencies for F-Droid compliance..."

node -e "
const fs = require('fs');
const packageJsonPath = '$ROOT_DIR/package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 1. Use FOSS Vision Camera fork
const fossVisionCamera = 'github:LuckyTheCookie/react-native-vision-camera-foss';
if (packageJson.dependencies['react-native-vision-camera']) {
  const originalVersion = packageJson.dependencies['react-native-vision-camera'];
  packageJson.dependencies['react-native-vision-camera'] = fossVisionCamera;
  console.log('✅ react-native-vision-camera: ' + originalVersion + ' → ' + fossVisionCamera);
}

// 2. REMOVE expo-notifications (contains Firebase)
if (packageJson.dependencies['expo-notifications']) {
  delete packageJson.dependencies['expo-notifications'];
  console.log('✅ expo-notifications REMOVED for F-Droid compliance');
}

// 3. REMOVE expo-application (contains InstallReferrer)
if (packageJson.dependencies['expo-application']) {
  delete packageJson.dependencies['expo-application'];
  console.log('✅ expo-application REMOVED for F-Droid compliance');
}

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
console.log('');
console.log('⚠️  WARNING: Push notifications disabled in F-Droid build');
console.log('⚠️  WARNING: Application info APIs disabled in F-Droid build');
"

# 3. Install dependencies
echo ""
echo "📦 Installing FOSS dependencies..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
fi
bun install --force

echo "🔧 Running Expo prebuild (Clean & Generate Android)..."
bunx expo prebuild --clean --platform android

# ==================================================
# 🔥 NO STUBS - NO FIREBASE CODE AT ALL
# ==================================================
echo ""
echo "🔥 Ensuring NO Firebase/GMS code exists..."

# Verify expo-notifications is gone
if [ -d "node_modules/expo-notifications" ]; then
    echo "  🗑️  Removing leftover expo-notifications..."
    rm -rf node_modules/expo-notifications
fi

# Verify expo-application is gone
if [ -d "node_modules/expo-application" ]; then
    echo "  🗑️  Removing leftover expo-application..."
    rm -rf node_modules/expo-application
fi

# Remove any generated notification code
if [ -d "android/app/src/main/java/expo/modules/notifications" ]; then
    rm -rf android/app/src/main/java/expo/modules/notifications
    echo "  ✅ Removed generated notification native code"
fi

if [ -d "android/app/src/main/java/expo/modules/application" ]; then
    rm -rf android/app/src/main/java/expo/modules/application
    echo "  ✅ Removed generated application native code"
fi

echo "  ✅ NO Firebase code present - NO STUBS NEEDED"

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
echo "🧹 Cleaning up Google Services references from Gradle..."
if [ -f "android/build.gradle" ]; then
  sed -i "/com\.google\.gms:google-services/d" "android/build.gradle"
  sed -i "/com\.google\.firebase/d" "android/build.gradle"
fi
if [ -f "android/app/build.gradle" ]; then
  sed -i "/apply plugin: 'com\.google\.gms\.google-services'/d" "android/app/build.gradle"
  sed -i "/apply plugin: 'com\.google\.firebase/d" "android/app/build.gradle"
fi
rm -f "android/app/google-services.json"

# 7. Patching Gradle for F-Droid Compliance
echo ""
echo "🔧 Patching Gradle for F-Droid Compliance..."

cat >> android/build.gradle <<'EOF'

// ==================================================
// F-Droid FOSS Patch: Global Exclusion of Proprietary Libraries
// ==================================================
allprojects {
    configurations.all {
        exclude group: 'com.google.firebase'
        exclude group: 'com.google.android.gms'
        exclude group: 'com.android.installreferrer'
        exclude group: 'com.google.mlkit'
        exclude module: 'firebase-messaging'
        exclude module: 'firebase-core'
        exclude module: 'firebase-analytics'
        exclude module: 'firebase-iid'
        exclude module: 'firebase-encoders'
        exclude module: 'firebase-encoders-json'
        exclude module: 'firebase-datatransport'
        exclude module: 'play-services-basement'
        exclude module: 'play-services-base'
        exclude module: 'play-services-tasks'
    }
}
EOF

cat >> android/app/build.gradle <<'EOF'

// ==================================================
// F-Droid FOSS Patch: Disable dependency metadata
// ==================================================
android {
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
}

configurations.all {
    exclude group: 'com.google.firebase'
    exclude group: 'com.google.android.gms'
    exclude group: 'com.android.installreferrer'
}
EOF

echo "  ✅ Gradle patched for F-Droid compliance"

# ==================================================
# 🔧 FIX: MediaPipe compilation order (Vision Camera V4 TurboModules)
# ==================================================
echo ""
echo "🔧 Fixing MediaPipe to work with Vision Camera V4 TurboModules..."

MEDIAPIPE_BUILD="node_modules/react-native-mediapipe-posedetection/android/build.gradle"

if [ -f "$MEDIAPIPE_BUILD" ]; then
    cp "$MEDIAPIPE_BUILD" "$MEDIAPIPE_BUILD.backup"
    
    echo "  🔧 Adding Vision Camera + Worklets dependencies to MediaPipe..."
    
    cat >> "$MEDIAPIPE_BUILD" <<'GRADLE_PATCH'

// ==================================================
// FOSS Patch: Fix Vision Camera V4 TurboModule dependencies
// ==================================================

dependencies {
    implementation project(':react-native-vision-camera')
    implementation project(':react-native-worklets-core')
}

tasks.configureEach { task ->
    if (task.name.contains("compileKotlin")) {
        def visionCameraCodegen = tasks.findByPath(":react-native-vision-camera:generateCodegenArtifactsFromSchema")
        if (visionCameraCodegen != null) {
            task.dependsOn(visionCameraCodegen)
        }
        
        def visionCameraCompile = tasks.findByPath(":react-native-vision-camera:compileReleaseKotlin")
        if (visionCameraCompile != null) {
            task.dependsOn(visionCameraCompile)
            task.mustRunAfter(visionCameraCompile)
        }
    }
}
GRADLE_PATCH
    
    echo "  ✅ MediaPipe build.gradle patched"
    
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
        fi
    fi
else
    echo "  ❌ ERROR: MediaPipe build.gradle not found!"
    exit 1
fi

echo "  ✅ MediaPipe compilation order fixed for TurboModules"

# 8. Dummy build.gradle for F-Droid Cleaner
echo ""
echo "🧹 Creating dummy Gradle files for F-Droid scanner..."
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
echo "=================================================="
echo "✅ F-Droid prebuild COMPLETED - 100% FOSS"
echo "=================================================="
echo ""
echo "🔍 Applied changes:"
echo "  ✅ expo-notifications plugin removed from app.json"
echo "  ✅ expo-notifications package removed from dependencies"
echo "  ✅ expo-application package removed from dependencies"
echo "  ✅ NO STUBS created (nothing to detect)"
echo "  ✅ Gradle exclusions configured"
echo "  ✅ Vision Camera FOSS fork integrated"
echo ""
echo "🚀 Ready for F-Droid build - 0 Firebase code!"
