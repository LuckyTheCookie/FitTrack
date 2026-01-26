#!/usr/bin/env bash
set -e

# ==================================================
# 🔨 Spix F-Droid Prebuild Script
# Flavor: FOSS (com.spix.app.foss)
# Fix: Force ALL Expo modules to build from source
# + REPRODUCIBLE BUILD optimizations
# + 🔥 SPLIT APKs & MINIFICATION (R8/ProGuard)
# + 🔥 FAKE TRANSPORT STUBS (Fix R8 Missing Class)
# ==================================================

echo "=================================================="
echo "🚀 Starting F-Droid Prebuild Process (Spix)"
echo "=================================================="

# ==================================================
# 1. Environment Setup - REPRODUCIBLE BUILD
# ==================================================
echo ""
echo "🔧 Setting up reproducible build environment..."

# Utiliser le timestamp du dernier commit Git pour la reproductibilité
if [ -z "$SOURCE_DATE_EPOCH" ]; then
    export SOURCE_DATE_EPOCH=$(git log -1 --pretty=%ct 2>/dev/null || date +%s)
fi
echo "  ✅ SOURCE_DATE_EPOCH: $SOURCE_DATE_EPOCH"

export EXPO_PUBLIC_BUILD_FLAVOR=foss
export NODE_ENV=production
export REACT_NATIVE_ENABLE_SOURCE_MAPS=false
ROOT_DIR="$(pwd)"

# ==================================================
# 2. Configure app.json for FOSS Package
# ==================================================
echo ""
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
# 3. Create/Patch metro.config.js for Reproducibility
# ==================================================
echo ""
echo "🔧 Configuring Metro bundler for reproducible builds..."

cat > metro.config.js <<'EOF'
const { getDefaultConfig } = require('expo/metro-config');
const crypto = require('crypto');

const config = getDefaultConfig(__dirname);

// ========================================
// REPRODUCIBLE BUILD CONFIGURATION
// ========================================

config.serializer = {
  ...config.serializer,
  
  // Use deterministic module IDs based on path hashing
  createModuleIdFactory: function() {
    return function(path) {
      // Normaliser le chemin pour être déterministe
      const normalizedPath = path.replace(/\\/g, '/');
      const hash = crypto.createHash('sha1').update(normalizedPath).digest('hex');
      return hash.substr(0, 8);
    };
  },
  
  // Process modules in a deterministic order
  processModuleFilter: function(module) {
    // Exclude test modules
    if (module.path.includes('/__tests__/') || 
        module.path.includes('/__mocks__/')) {
      return false;
    }
    return true;
  },
};

// Transformer config for reproducibility
config.transformer = {
  ...config.transformer,
  enableBabelRCLookup: false,
  minifierConfig: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      keep_classnames: false,
      keep_fnames: false,
    },
  },
};

// Disable source maps in production
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
EOF

echo "  ✅ metro.config.js configured for reproducible builds"

# ==================================================
# 📦 Create Local FOSS Stubs WITH NATIVE MODULES
# ==================================================
echo ""
echo "📦 Creating local FOSS stubs with native Android modules..."
mkdir -p stubs/expo-notifications/android/src/main/java/expo/modules/notifications
mkdir -p stubs/expo-application

# ==================================================
# Stub: expo-notifications (JS + ANDROID)
# ==================================================

# package.json
cat > stubs/expo-notifications/package.json <<'EOF'
{
  "name": "expo-notifications",
  "version": "0.32.16",
  "main": "index.js",
  "types": "index.d.ts"
}
EOF

# index.js
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

# index.d.ts
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

# 🔥 ANDROID MODULE (EMPTY BUT VALID)
cat > stubs/expo-notifications/android/build.gradle <<'EOF'
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'

android {
  namespace "expo.modules.notifications"
  compileSdkVersion 36
  
  defaultConfig {
    minSdkVersion 26
    targetSdkVersion 36
  }
}

dependencies {
  implementation project(':expo-modules-core')
}
EOF

# expo-module.config.json
cat > stubs/expo-notifications/expo-module.config.json <<'EOF'
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.notifications.NotificationsPackage"]
  }
}
EOF

# NotificationsPackage.kt (module natif vide)
cat > stubs/expo-notifications/android/src/main/java/expo/modules/notifications/NotificationsPackage.kt <<'EOF'
package expo.modules.notifications

import expo.modules.core.BasePackage

class NotificationsPackage : BasePackage() {
  override fun createExportedModules(context: android.content.Context) = listOf(
    ExpoPushTokenManagerModule(context)
  )
}
EOF

# ExpoPushTokenManagerModule.kt (le module qui manque)
cat > stubs/expo-notifications/android/src/main/java/expo/modules/notifications/ExpoPushTokenManagerModule.kt <<'EOF'
package expo.modules.notifications

import android.content.Context
import expo.modules.core.ExportedModule
import expo.modules.core.interfaces.ExpoMethod
import expo.modules.core.Promise

class ExpoPushTokenManagerModule(context: Context) : ExportedModule(context) {
  override fun getName() = "ExpoPushTokenManager"
  
  @ExpoMethod
  fun getDevicePushTokenAsync(promise: Promise) {
    promise.reject("ERR_UNAVAILABLE", "[FOSS] Push notifications are disabled")
  }
}
EOF

echo "  ✅ expo-notifications stub with native Android module"

# ==================================================
# Stub: expo-application
# ==================================================
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
# 🔥 CRITICAL FIX: Create Dummy Classes for MediaPipe/DataTransport
# ==================================================
echo ""
echo "🚑 Creating Dummy Java Stubs for missing DataTransport classes..."
# R8 refuse de compiler si ces classes manquent, même avec -dontwarn.
# On crée donc des coquilles vides pour satisfaire le compilateur.

STUB_DIR="android/app/src/main/java/com/google/android/datatransport"
mkdir -p "$STUB_DIR/runtime"
mkdir -p "$STUB_DIR/cct"

# Stub: TransportFactory
cat > "$STUB_DIR/TransportFactory.java" <<'EOF'
package com.google.android.datatransport;
public interface TransportFactory {
    <T> Transport<T> getTransport(String name, Class<T> payloadType, Transformer<T, byte[]> payloadTransformer);
    <T> Transport<T> getTransport(String name, Class<T> payloadType, Encoding encoding, Transformer<T, byte[]> payloadTransformer);
}
EOF

# Stub: Transport
cat > "$STUB_DIR/Transport.java" <<'EOF'
package com.google.android.datatransport;
public interface Transport<T> {
    void send(Event<T> event);
    void schedule(Event<T> event, TransportScheduleCallback callback);
}
EOF

# Stub: Event
cat > "$STUB_DIR/Event.java" <<'EOF'
package com.google.android.datatransport;
public abstract class Event<T> {
    public static <T> Event<T> ofData(int code, T payload) { return null; }
    public static <T> Event<T> ofTelemetry(int code, T payload) { return null; }
    public static <T> Event<T> ofUrgent(int code, T payload) { return null; }
    public abstract Integer getCode();
    public abstract T getPayload();
    public abstract Priority getPriority();
}
EOF

# Stub: Transformer
cat > "$STUB_DIR/Transformer.java" <<'EOF'
package com.google.android.datatransport;
public interface Transformer<T, U> {
    U apply(T input);
}
EOF

# Stub: Encoding
cat > "$STUB_DIR/Encoding.java" <<'EOF'
package com.google.android.datatransport;
public final class Encoding {
    public Encoding(String name) {}
    public static Encoding of(String name) { return new Encoding(name); }
}
EOF

# Stub: Priority (Enum)
cat > "$STUB_DIR/Priority.java" <<'EOF'
package com.google.android.datatransport;
public enum Priority {
    DEFAULT, VERY_LOW, HIGHEST
}
EOF

# Stub: TransportScheduleCallback
cat > "$STUB_DIR/TransportScheduleCallback.java" <<'EOF'
package com.google.android.datatransport;
public interface TransportScheduleCallback {
    void onSchedule(Exception error);
}
EOF

# Stub: TransportRuntime
cat > "$STUB_DIR/runtime/TransportRuntime.java" <<'EOF'
package com.google.android.datatransport.runtime;
import com.google.android.datatransport.TransportFactory;
import android.content.Context;

public class TransportRuntime {
    public static void initialize(Context context) {}
    public static TransportRuntime getInstance() { return new TransportRuntime(); }
    public TransportFactory newFactory(String backendName) { 
        return new TransportFactory() {
            @Override
            public <T> com.google.android.datatransport.Transport<T> getTransport(String name, Class<T> payloadType, com.google.android.datatransport.Transformer<T, byte[]> payloadTransformer) { return null; }
            @Override
            public <T> com.google.android.datatransport.Transport<T> getTransport(String name, Class<T> payloadType, com.google.android.datatransport.Encoding encoding, com.google.android.datatransport.Transformer<T, byte[]> payloadTransformer) { return null; }
        };
    }
}
EOF

# Stub: Destination
cat > "$STUB_DIR/runtime/Destination.java" <<'EOF'
package com.google.android.datatransport.runtime;
public interface Destination {
    String getName();
    byte[] getExtras();
}
EOF

# Stub: CCTDestination
cat > "$STUB_DIR/cct/CCTDestination.java" <<'EOF'
package com.google.android.datatransport.cct;
import com.google.android.datatransport.Encoding;
import com.google.android.datatransport.runtime.Destination;

public final class CCTDestination implements Destination {
    public static final CCTDestination INSTANCE = new CCTDestination();
    public static final CCTDestination LEGACY_INSTANCE = new CCTDestination();
    @Override public String getName() { return "cct"; }
    @Override public byte[] getExtras() { return null; }
}
EOF

echo "  ✅ Dummy Java stubs created. R8 should be happy now."

# ==================================================
# 📦 Patch package.json (CRITICAL FOR F-DROID)
# ==================================================
echo ""
echo "📦 Configuring package.json for F-Droid..."

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
packageJson.dependencies['expo-notifications'] = 'file:./stubs/expo-notifications';
packageJson.dependencies['expo-application'] = 'file:./stubs/expo-application';
console.log('✅ expo-notifications -> file:./stubs/expo-notifications');
console.log('✅ expo-application -> file:./stubs/expo-application');

// 3. KEEP expo-notifications in autolinking (we need the stub native module)
packageJson.expo = packageJson.expo || {};
packageJson.expo.autolinking = packageJson.expo.autolinking || {};
packageJson.expo.autolinking.exclude = ['expo-application'];  // Only exclude application

// 4. 🔥 CRITICAL: Force ALL Expo modules to build from source (SDK 53+)
packageJson.expo.autolinking.android = packageJson.expo.autolinking.android || {};
packageJson.expo.autolinking.android.buildFromSource = ['.*'];

console.log('✅ Forced buildFromSource for ALL Expo modules');

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
"

# ==================================================
# 4. Install dependencies
# ==================================================
echo ""
echo "📦 Installing dependencies (including stubs)..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
fi

# Lock file pour reproductibilité
npm install --force --package-lock-only
npm ci --force || npm install --force

# ==================================================
# 🧹 Patch Expo modules BEFORE prebuild
# ==================================================
echo ""
echo "🔧 Patching node_modules Gradle files..."

# Patch expo-application (stub doesn't need patching but original might exist)
EXPO_APP_GRADLE="node_modules/expo-application/android/build.gradle"
if [ -f "$EXPO_APP_GRADLE" ]; then
  sed -i '/com\.android\.installreferrer/d' "$EXPO_APP_GRADLE"
  echo "  ✅ Removed installreferrer from expo-application"
fi

# ==================================================
# 🔧 Run Expo Prebuild
# ==================================================
echo ""
echo "🔧 Running Expo prebuild (Clean & Generate Android)..."
npx expo prebuild --clean --platform android

# ==================================================
# 🔥 Verify buildFromSource is working
# ==================================================
echo ""
echo "🔍 Verifying Expo autolinking configuration..."

# Vérifier que les modules sont bien configurés pour build from source
if grep -q "buildFromSource" package.json; then
  echo "  ✅ buildFromSource configuration found in package.json"
else
  echo "  ⚠️ WARNING: buildFromSource not found - adding it now"
  node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.expo = pkg.expo || {};
  pkg.expo.autolinking = pkg.expo.autolinking || {};
  pkg.expo.autolinking.android = pkg.expo.autolinking.android || {};
  pkg.expo.autolinking.android.buildFromSource = ['.*'];
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi

# ==================================================
# 🔥 CLEANUP: Native modules
# ==================================================
echo ""
echo "🔥 Verifying native cleanup..."
# NE PAS supprimer expo-notifications car on utilise notre stub !
rm -rf android/app/src/main/java/expo/modules/application
echo "  ✅ Native code verification complete"

# ==================================================
# 5. Patching Native Files
# ==================================================
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

# 6. Patch AndroidManifest
if [ -f "scripts/patch-health-connect.js" ]; then
  node "scripts/patch-health-connect.js" "$ANDROID_MAIN_DIR/AndroidManifest.xml"
  echo "  ✅ AndroidManifest.xml patched"
fi

# ==================================================
# 7. Cleanup Google Services from Gradle
# ==================================================
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

# ==================================================
# 8. Patching Gradle (AGGRESSIVE MODE + REPRODUCIBLE + SPLITS)
# ==================================================
echo ""
echo "🔧 Patching Gradle (Reproducible + Aggressive Exclusions + Splits)..."

# Configuration globale
cat >> android/build.gradle <<'EOF'
allprojects {
    configurations.all {
        exclude group: 'com.google.firebase'
        exclude group: 'com.google.android.gms'
        exclude group: 'com.android.installreferrer'
        exclude group: 'com.google.android.datatransport'
        exclude module: 'firebase-encoders-proto'
        exclude module: 'firebase-encoders'
        exclude module: 'firebase-encoders-json'
        exclude module: 'transport-runtime'
        exclude module: 'transport-api'
    }
}
EOF

# Configuration de l'application (MODIFIÉE POUR SPLITS & MINIFICATION)
cat >> android/app/build.gradle <<'EOF'

android {
    // 🔥 SPLIT APKS: Generate one APK per architecture
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk false
        }
    }

    // 🔥 MINIFICATION: Enable ProGuard/R8
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            // 🔥 CRITICAL: Strip native debug symbols for size
            ndk {
                debugSymbolLevel 'NONE'
            }
        }
    }

    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
    
    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
        
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/LICENSE.txt'
        exclude 'META-INF/license.txt'
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/NOTICE.txt'
        exclude 'META-INF/notice.txt'
        exclude 'META-INF/ASL2.0'
    }
}

// REPRODUCIBLE BUILD: Configuration React Native
project.ext.react = [
    enableHermes: true,
    bundleCommand: "bundle",
    bundleConfig: "../metro.config.js",
    devDisabledInProd: true,
    bundleInRelease: true,
]

configurations.all {
    exclude group: 'com.google.firebase'
    exclude group: 'com.google.android.gms'
    exclude group: 'com.android.installreferrer'
    exclude group: 'com.google.android.datatransport'
    exclude module: 'firebase-encoders-proto'
    exclude module: 'firebase-encoders'
}
EOF

# 🔥 CREATE DEFAULT PROGUARD RULES if missing
if [ ! -f "android/app/proguard-rules.pro" ]; then
    echo "📝 Creating default proguard-rules.pro..."
    cat > android/app/proguard-rules.pro <<'EOF'
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }

# Vision Camera & MediaPipe
-keep class com.mrousavy.camera.** { *; }
-keep class com.google.mediapipe.** { *; }
-keep class com.mediapipe.tasks.** { *; }

# NOS STUBS (Important : ne pas obfusquer nos faux noms de classes)
-keep class com.google.android.datatransport.** { *; }

# Safety
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn com.google.android.gms.**
-dontwarn com.google.firebase.**
EOF
    echo "  ✅ proguard-rules.pro created"
fi

echo "  ✅ Gradle patched (Splits enabled + Minification enabled + Stubs)"

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

# ==================================================
# 🔧 FIX: Restore Hermes Compiler Permissions
# ==================================================
echo ""
echo "🔧 Restoring hermesc executable permissions..."

HERMESC_LINUX="node_modules/react-native/sdks/hermesc/linux64-bin/hermesc"

if [ -f "$HERMESC_LINUX" ]; then
  chmod +x "$HERMESC_LINUX"
  echo "  ✅ hermesc permissions restored: $HERMESC_LINUX"
  
  # Vérifier que le binaire fonctionne
  if "$HERMESC_LINUX" --version &>/dev/null; then
    echo "  ✅ hermesc is working correctly"
  else
    echo "  ⚠️ WARNING: hermesc exists but might not work"
  fi
else
  echo "  ❌ ERROR: hermesc not found at $HERMESC_LINUX"
fi

# ==================================================
# 🧹 FINAL CLEANUP
# ==================================================
echo ""
echo "🧹 Final cleanup..."
rm -rf android/app/build/intermediates
rm -rf android/app/build/generated/res/google-services
rm -rf android/app/src/main/assets/index.android.bundle

# Supprime les binaires (sera refait par scandelete)
find node_modules -name "*.aar" -delete 2>/dev/null || true
find node_modules -name "*.jar" ! -name "gradle-wrapper.jar" -delete 2>/dev/null || true
find node_modules -name "gradle-wrapper.jar" -delete 2>/dev/null || true

echo "  ✅ Intermediates cleaned"

# ==================================================
# 9. Dummy build.gradle
# ==================================================
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
echo "✅ F-Droid prebuild COMPLETED (Spix)"
echo "=================================================="
echo "  ✅ SOURCE_DATE_EPOCH: $SOURCE_DATE_EPOCH (from git)"
echo "  ✅ metro.config.js: Deterministic module IDs"
echo "  ✅ Source maps: Disabled for reproducibility"
echo "  ✅ buildFromSource: ['.*'] configured"
echo "  ✅ expo-notifications stub with native module"
echo "  ✅ ALL Expo modules will compile from source"
echo "  ✅ SPLITS: 4 APKs will be generated (arm64, armv7, x86, x64)"
echo "  ✅ MINIFICATION: R8/ProGuard enabled"
echo "  ✅ DATA TRANSPORT: Faked with Java Stubs to fix R8 missing classes"
echo "🚀 Ready !"
