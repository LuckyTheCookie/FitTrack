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

# ==================================================
# 🔥 CRITICAL: Remove ALL Firebase & Google Services
# ==================================================
echo ""
echo "🔥 REMOVING ALL FIREBASE & GOOGLE SERVICES DEPENDENCIES..."

# Strip Firebase from expo-notifications
EXPO_NOTIF_GRADLE="node_modules/expo-notifications/android/build.gradle"
if [ -f "$EXPO_NOTIF_GRADLE" ]; then
    echo "  🧹 Cleaning expo-notifications/build.gradle..."
    sed -i '/com\.google\.firebase/d' "$EXPO_NOTIF_GRADLE"
    sed -i '/firebase-messaging/d' "$EXPO_NOTIF_GRADLE"
    sed -i '/firebase-core/d' "$EXPO_NOTIF_GRADLE"
    sed -i '/firebase-analytics/d' "$EXPO_NOTIF_GRADLE"
    echo "  ✅ Firebase removed from expo-notifications"
fi

# Strip InstallReferrer from expo-application
EXPO_APP_GRADLE="node_modules/expo-application/android/build.gradle"
if [ -f "$EXPO_APP_GRADLE" ]; then
    echo "  🧹 Cleaning expo-application/build.gradle..."
    sed -i '/com\.android\.installreferrer/d' "$EXPO_APP_GRADLE"
    sed -i '/installreferrer/d' "$EXPO_APP_GRADLE"
    echo "  ✅ InstallReferrer removed from expo-application"
fi

# Create stub classes to prevent compilation errors
echo ""
echo "📦 Creating FOSS stub classes..."

# Firebase Messaging stub
FIREBASE_STUB_DIR="node_modules/expo-notifications/android/src/main/java/com/google/firebase/messaging"
mkdir -p "$FIREBASE_STUB_DIR"
cat > "$FIREBASE_STUB_DIR/FirebaseMessagingService.java" <<'EOF'
package com.google.firebase.messaging;

// FOSS Stub: Firebase Messaging not available in F-Droid builds
public class FirebaseMessagingService {
    public void onMessageReceived(RemoteMessage message) {}
}
EOF

cat > "$FIREBASE_STUB_DIR/RemoteMessage.java" <<'EOF'
package com.google.firebase.messaging;

// FOSS Stub: Firebase Messaging not available in F-Droid builds
public class RemoteMessage {
    public String getData() { return ""; }
}
EOF

cat > "$FIREBASE_STUB_DIR/FirebaseMessaging.java" <<'EOF'
package com.google.firebase.messaging;

// FOSS Stub: Firebase Messaging not available in F-Droid builds
public class FirebaseMessaging {
    public static FirebaseMessaging getInstance() { return new FirebaseMessaging(); }
    public void getToken() {}
}
EOF

# Firebase Encoders stubs
FIREBASE_ENCODERS_DIR="node_modules/expo-notifications/android/src/main/java/com/google/firebase/encoders"
mkdir -p "$FIREBASE_ENCODERS_DIR/config"
mkdir -p "$FIREBASE_ENCODERS_DIR/proto"

cat > "$FIREBASE_ENCODERS_DIR/DataEncoder.java" <<'EOF'
package com.google.firebase.encoders;
public interface DataEncoder {}
EOF

cat > "$FIREBASE_ENCODERS_DIR/ObjectEncoder.java" <<'EOF'
package com.google.firebase.encoders;
public interface ObjectEncoder<T> {}
EOF

cat > "$FIREBASE_ENCODERS_DIR/ObjectEncoderContext.java" <<'EOF'
package com.google.firebase.encoders;
public interface ObjectEncoderContext {}
EOF

cat > "$FIREBASE_ENCODERS_DIR/FieldDescriptor.java" <<'EOF'
package com.google.firebase.encoders;
public final class FieldDescriptor {}
EOF

cat > "$FIREBASE_ENCODERS_DIR/EncodingException.java" <<'EOF'
package com.google.firebase.encoders;
public class EncodingException extends Exception {}
EOF

cat > "$FIREBASE_ENCODERS_DIR/config/EncoderConfig.java" <<'EOF'
package com.google.firebase.encoders.config;
public interface EncoderConfig<T> {}
EOF

cat > "$FIREBASE_ENCODERS_DIR/config/Configurator.java" <<'EOF'
package com.google.firebase.encoders.config;
public interface Configurator {}
EOF

cat > "$FIREBASE_ENCODERS_DIR/proto/ProtoEnum.java" <<'EOF'
package com.google.firebase.encoders.proto;
public @interface ProtoEnum {}
EOF

cat > "$FIREBASE_ENCODERS_DIR/proto/ProtobufEncoder.java" <<'EOF'
package com.google.firebase.encoders.proto;
public class ProtobufEncoder {}
EOF

# Google Play Services Tasks stub
GMS_TASKS_DIR="node_modules/expo-notifications/android/src/main/java/com/google/android/gms/tasks"
mkdir -p "$GMS_TASKS_DIR"

cat > "$GMS_TASKS_DIR/Task.java" <<'EOF'
package com.google.android.gms.tasks;
public abstract class Task<TResult> {}
EOF

cat > "$GMS_TASKS_DIR/OnCompleteListener.java" <<'EOF'
package com.google.android.gms.tasks;
public interface OnCompleteListener<TResult> {}
EOF

# InstallReferrer stub
INSTALL_REF_DIR="node_modules/expo-application/android/src/main/java/com/android/installreferrer/api"
mkdir -p "$INSTALL_REF_DIR"

cat > "$INSTALL_REF_DIR/InstallReferrerClient.java" <<'EOF'
package com.android.installreferrer.api;

// FOSS Stub: Install Referrer not available in F-Droid builds
public abstract class InstallReferrerClient {
    public static InstallReferrerClient.Builder newBuilder(android.content.Context context) {
        return new Builder();
    }
    
    public static class Builder {
        public InstallReferrerClient build() { return null; }
    }
}
EOF

cat > "$INSTALL_REF_DIR/InstallReferrerStateListener.java" <<'EOF'
package com.android.installreferrer.api;

// FOSS Stub: Install Referrer not available in F-Droid builds
public interface InstallReferrerStateListener {
    void onInstallReferrerSetupFinished(int responseCode);
    void onInstallReferrerServiceDisconnected();
}
EOF

echo "  ✅ All FOSS stub classes created"

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

# 7. Patching Gradle for F-Droid Compliance (CRITICAL)
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
        exclude module: 'play-services-basement'
        exclude module: 'play-services-base'
        exclude module: 'play-services-tasks'
    }
    
    // Force remove Firebase at resolution time
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == 'com.google.firebase') {
                    details.useVersion('')
                }
                if (details.requested.group == 'com.google.android.gms') {
                    details.useVersion('')
                }
                if (details.requested.group == 'com.android.installreferrer') {
                    details.useVersion('')
                }
            }
        }
    }
}
EOF

cat >> android/app/build.gradle <<'EOF'

// ==================================================
// F-Droid FOSS Patch: Disable dependency metadata & proprietary libs
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
    # Backup original
    cp "$MEDIAPIPE_BUILD" "$MEDIAPIPE_BUILD.backup"
    
    echo "  🔧 Adding Vision Camera + Worklets dependencies to MediaPipe..."
    
    # Ajouter les dépendances + forcer l'ordre de compilation
    cat >> "$MEDIAPIPE_BUILD" <<'GRADLE_PATCH'

// ==================================================
// FOSS Patch: Fix Vision Camera V4 TurboModule dependencies
// ==================================================

dependencies {
    // Vision Camera V4 classes are generated via TurboModules
    implementation project(':react-native-vision-camera')
    // Frame processor classes come from Worklets
    implementation project(':react-native-worklets-core')
}

// Force MediaPipe to compile AFTER Vision Camera classes are generated
tasks.configureEach { task ->
    if (task.name.contains("compileKotlin")) {
        // Wait for Vision Camera codegen to finish
        def visionCameraCodegen = tasks.findByPath(":react-native-vision-camera:generateCodegenArtifactsFromSchema")
        if (visionCameraCodegen != null) {
            task.dependsOn(visionCameraCodegen)
        }
        
        // Wait for Vision Camera to compile first
        def visionCameraCompile = tasks.findByPath(":react-native-vision-camera:compileReleaseKotlin")
        if (visionCameraCompile != null) {
            task.dependsOn(visionCameraCompile)
            task.mustRunAfter(visionCameraCompile)
        }
    }
}
GRADLE_PATCH
    
    echo "  ✅ MediaPipe build.gradle patched"
    
    # S'assurer que Vision Camera est enregistré dans settings.gradle
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
echo "✅ F-Droid prebuild COMPLETED - FOSS compliant"
echo "=================================================="
echo ""
echo "🔍 Verification steps applied:"
echo "  ✅ Firebase removed from expo-notifications"
echo "  ✅ InstallReferrer removed from expo-application"
echo "  ✅ FOSS stub classes created (16 stubs)"
echo "  ✅ Gradle exclusions configured"
echo "  ✅ Vision Camera FOSS fork integrated"
echo ""
echo "🚀 Ready for F-Droid build!"
