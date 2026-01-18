#!/usr/bin/env bash
set -e

# ==================================================
# 🔨 Spix F-Droid Prebuild Script
# Flavor: FOSS (com.spix.app.foss)
# Method: LOCAL FILE STUBS (Robust)
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

const fossPackage = 'com.spix.app.foss';
appJson.expo.android.package = fossPackage;
appJson.expo.ios.bundleIdentifier = 'com.spix.app';

// CRITICAL: Remove expo-notifications and expo-application plugins
if (appJson.expo.plugins) {
  appJson.expo.plugins = appJson.expo.plugins.filter(plugin => {
    if (typeof plugin === 'string') {
      return plugin !== 'expo-notifications' && plugin !== 'expo-application';
    }
    if (Array.isArray(plugin)) {
      return plugin[0] !== 'expo-notifications' && plugin[0] !== 'expo-application';
    }
    return true;
  });
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log('✅ app.json configured for FOSS build');
"

# ==================================================
# 📦 Create Local FOSS Stubs
# ==================================================
echo ""
echo "📦 Creating local FOSS stubs..."
mkdir -p stubs/expo-notifications
mkdir -p stubs/expo-application

# Stub: expo-notifications
cat > stubs/expo-notifications/package.json <<'EOF'
{
  "name": "expo-notifications",
  "version": "0.32.16",
  "main": "index.js",
  "types": "index.d.ts"
}
EOF

cat > stubs/expo-notifications/index.js <<'EOF'
console.warn('[FOSS] Push notifications disabled');
export const setNotificationHandler = () => {};
export const requestPermissionsAsync = async () => ({ status: 'denied' });
export const getPermissionsAsync = async () => ({ status: 'denied' });
export const scheduleNotificationAsync = async () => null;
export const cancelScheduledNotificationAsync = async () => {};
export const cancelAllScheduledNotificationsAsync = async () => {};
export const getExpoPushTokenAsync = async () => null;
export const addNotificationReceivedListener = () => ({ remove: () => {} });
export const addNotificationResponseReceivedListener = () => ({ remove: () => {} });
export const removeNotificationSubscription = () => {};
EOF

cat > stubs/expo-notifications/index.d.ts <<'EOF'
export type NotificationPermissionsStatus = { status: 'granted' | 'denied' | 'undetermined' };
export function setNotificationHandler(handler: any): void;
export function requestPermissionsAsync(): Promise<NotificationPermissionsStatus>;
export function getPermissionsAsync(): Promise<NotificationPermissionsStatus>;
export function scheduleNotificationAsync(content: any, trigger: any): Promise<string | null>;
export function cancelScheduledNotificationAsync(id: string): Promise<void>;
export function cancelAllScheduledNotificationsAsync(): Promise<void>;
export function getExpoPushTokenAsync(options?: any): Promise<any>;
export function addNotificationReceivedListener(listener: any): { remove: () => void };
export function addNotificationResponseReceivedListener(listener: any): { remove: () => void };
export function removeNotificationSubscription(subscription: any): void;
EOF

# Stub: expo-application
cat > stubs/expo-application/package.json <<'EOF'
{
  "name": "expo-application",
  "version": "7.0.8",
  "main": "index.js",
  "types": "index.d.ts"
}
EOF

cat > stubs/expo-application/index.js <<'EOF'
import Constants from 'expo-constants';
export const applicationName = Constants.expoConfig?.name || 'Spix';
export const applicationId = Constants.expoConfig?.android?.package || 'com.spix.app.foss';
export const nativeApplicationVersion = Constants.expoConfig?.version || '1.0.0';
export const nativeBuildVersion = String(Constants.expoConfig?.android?.versionCode || 1);
export async function getInstallReferrerAsync() { return null; }
EOF

cat > stubs/expo-application/index.d.ts <<'EOF'
export const applicationName: string;
export const applicationId: string;
export const nativeApplicationVersion: string;
export const nativeBuildVersion: string;
export function getInstallReferrerAsync(): Promise<any>;
EOF

echo "  ✅ Local stubs created in ./stubs/"

# ==================================================
# 📦 Patch package.json to use Stubs
# ==================================================
echo ""
echo "📦 Redirecting dependencies to local stubs..."

node -e "
const fs = require('fs');
const packageJsonPath = '$ROOT_DIR/package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 1. Use FOSS Vision Camera
const fossVisionCamera = 'github:LuckyTheCookie/react-native-vision-camera-foss';
if (packageJson.dependencies['react-native-vision-camera']) {
  packageJson.dependencies['react-native-vision-camera'] = fossVisionCamera;
  console.log('✅ react-native-vision-camera -> FOSS Fork');
}

// 2. Use Local Stubs
// IMPORTANT: bun/npm will install from these folders
packageJson.dependencies['expo-notifications'] = 'file:./stubs/expo-notifications';
packageJson.dependencies['expo-application'] = 'file:./stubs/expo-application';
console.log('✅ expo-notifications -> file:./stubs/expo-notifications');
console.log('✅ expo-application -> file:./stubs/expo-application');

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
"

# 3. Install dependencies
echo ""
echo "📦 Installing dependencies (including stubs)..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
fi
bun install --force

echo "🔧 Running Expo prebuild (Clean & Generate Android)..."
bunx expo prebuild --clean --platform android

# ==================================================
# 🔥 CLEANUP: Ensure no native modules linked for stubs
# ==================================================
echo ""
echo "🔥 Verifying native cleanup..."
# Autolinking should skip stubs because they have no android/ folder
# But we double check:
rm -rf android/app/src/main/java/expo/modules/notifications
rm -rf android/app/src/main/java/expo/modules/application
echo "  ✅ Native code verification complete"

# 4. Patching Native Files
echo ""
echo "🏥 Patching Health Connect configuration..."
ANDROID_MAIN_DIR="android/app/src/main"
PATCHES_DIR="scripts/android-patches"

MAIN_ACTIVITY_PATH=$(find "$ANDROID_MAIN_DIR/java" -name "MainActivity.kt" | head -n 1)

if [ -f "$MAIN_ACTIVITY_PATH" ]; then
  CURRENT_PACKAGE_LINE=$(grep "^package " "$MAIN_ACTIVITY_PATH")
  if [ -f "$PATCHES_DIR/MainActivity.kt.patch" ]; then
    cp "$PATCHES_DIR/MainActivity.kt.patch" "$MAIN_ACTIVITY_PATH"
    sed -i "s/^package .*/$CURRENT_PACKAGE_LINE/" "$MAIN_ACTIVITY_PATH"
    echo "  ✅ MainActivity.kt patched"
  fi
  
  DEST_DIR=$(dirname "$MAIN_ACTIVITY_PATH")
  if [ -f "$PATCHES_DIR/PermissionsRationaleActivity.kt" ]; then
    cp "$PATCHES_DIR/PermissionsRationaleActivity.kt" "$DEST_DIR/PermissionsRationaleActivity.kt"
    CURRENT_PACKAGE_NAME=$(echo "$CURRENT_PACKAGE_LINE" | sed 's/package //;s/;//')
    sed -i "s/^package .*/package $CURRENT_PACKAGE_NAME/" "$DEST_DIR/PermissionsRationaleActivity.kt"
    echo "  ✅ PermissionsRationaleActivity.kt copied"
  fi
fi

# 5. Patch AndroidManifest
if [ -f "scripts/patch-health-connect.js" ]; then
  node "scripts/patch-health-connect.js" "$ANDROID_MAIN_DIR/AndroidManifest.xml"
  echo "  ✅ AndroidManifest.xml patched"
fi

# 6. Cleanup Google Services from Gradle
echo ""
echo "🧹 Cleaning up Google Services..."
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
echo "🔧 Patching Gradle (Aggressive Exclusions)..."

cat >> android/build.gradle <<'EOF'
allprojects {
    configurations.all {
        exclude group: 'com.google.firebase'
        exclude group: 'com.google.android.gms'
        exclude group: 'com.android.installreferrer'
        exclude group: 'com.google.mlkit'
        exclude group: 'com.google.android.datatransport'
        exclude module: 'firebase-encoders-proto'
        exclude module: 'firebase-encoders'
    }
}
EOF

cat >> android/app/build.gradle <<'EOF'
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
    exclude group: 'com.google.android.datatransport'
}
EOF

echo "  ✅ Gradle patched (Transport & Encoders excluded)"

# ==================================================
# 🔧 FIX: MediaPipe
# ==================================================
echo ""
echo "🔧 Fixing MediaPipe dependencies..."
MEDIAPIPE_BUILD="node_modules/react-native-mediapipe-posedetection/android/build.gradle"

if [ -f "$MEDIAPIPE_BUILD" ]; then
    cp "$MEDIAPIPE_BUILD" "$MEDIAPIPE_BUILD.backup"
    cat >> "$MEDIAPIPE_BUILD" <<'GRADLE_PATCH'
dependencies {
    implementation project(':react-native-vision-camera')
    implementation project(':react-native-worklets-core')
}
tasks.configureEach { task ->
    if (task.name.contains("compileKotlin")) {
        def vcCodegen = tasks.findByPath(":react-native-vision-camera:generateCodegenArtifactsFromSchema")
        if (vcCodegen != null) task.dependsOn(vcCodegen)
        def vcCompile = tasks.findByPath(":react-native-vision-camera:compileReleaseKotlin")
        if (vcCompile != null) {
            task.dependsOn(vcCompile)
            task.mustRunAfter(vcCompile)
        }
    }
}
GRADLE_PATCH
    echo "  ✅ MediaPipe build.gradle patched"
fi

SETTINGS_GRADLE="android/settings.gradle"
if [ -f "$SETTINGS_GRADLE" ]; then
    if ! grep -q "react-native-vision-camera" "$SETTINGS_GRADLE"; then
        cat >> "$SETTINGS_GRADLE" <<EOF
include ':react-native-vision-camera'
project(':react-native-vision-camera').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-vision-camera/android')
EOF
        echo "  ✅ Vision Camera registered"
    fi
fi

# 8. Dummy build.gradle
echo ""
echo "🧹 Creating dummy Gradle files..."
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
echo "✅ F-Droid prebuild COMPLETED"
echo "=================================================="
echo "  ✅ Modules replaced by local stubs (expo-notifications, expo-application)"
echo "  ✅ Dependencies installed from ./stubs/"
echo "  ✅ Source code imports preserved (Metro resolves to stubs)"
echo "  ✅ Gradle configured to exclude Transport & Encoders"
echo "🚀 Ready for F-Droid build!"
