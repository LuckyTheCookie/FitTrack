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
# 🔥 CRITICAL: Remove ALL Firebase & Google Services CODE
# ==================================================
echo ""
echo "🔥 REMOVING ALL FIREBASE & GOOGLE SERVICES CODE..."

# Strip Firebase from expo-notifications build.gradle
EXPO_NOTIF_GRADLE="node_modules/expo-notifications/android/build.gradle"
if [ -f "$EXPO_NOTIF_GRADLE" ]; then
    echo "  🧹 Cleaning expo-notifications/build.gradle..."
    sed -i '/com\.google\.firebase/d' "$EXPO_NOTIF_GRADLE"
    sed -i '/firebase-messaging/d' "$EXPO_NOTIF_GRADLE"
    sed -i '/firebase-core/d' "$EXPO_NOTIF_GRADLE"
    sed -i '/firebase-analytics/d' "$EXPO_NOTIF_GRADLE"
    echo "  ✅ Firebase removed from expo-notifications build.gradle"
fi

# Strip InstallReferrer from expo-application build.gradle
EXPO_APP_GRADLE="node_modules/expo-application/android/build.gradle"
if [ -f "$EXPO_APP_GRADLE" ]; then
    echo "  🧹 Cleaning expo-application/build.gradle..."
    sed -i '/com\.android\.installreferrer/d' "$EXPO_APP_GRADLE"
    sed -i '/installreferrer/d' "$EXPO_APP_GRADLE"
    echo "  ✅ InstallReferrer removed from expo-application build.gradle"
fi

# ==================================================
# 🚨 NEW APPROACH: Delete Firebase code instead of stubbing
# ==================================================
echo ""
echo "🗑️  DELETING Firebase & GMS code from expo modules..."

# Delete ALL Firebase-related Java/Kotlin files from expo-notifications
if [ -d "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications" ]; then
    echo "  🔥 Removing Firebase classes from expo-notifications..."
    
    # Delete Firebase-specific service files
    find node_modules/expo-notifications/android/src -type f \( -name "*Firebase*" -o -name "*Fcm*" -o -name "*PushToken*" \) -delete
    
    # Comment out Firebase imports in remaining files
    find node_modules/expo-notifications/android/src -type f \( -name "*.java" -o -name "*.kt" \) -exec sed -i \
        -e 's/^import com\.google\.firebase/\/\/ FOSS: import com.google.firebase/g' \
        -e 's/^import com\.google\.android\.gms/\/\/ FOSS: import com.google.android.gms/g' \
        {} +
    
    echo "  ✅ Firebase code removed from expo-notifications"
fi

# Delete InstallReferrer code from expo-application
if [ -d "node_modules/expo-application/android/src/main/java/expo/modules/application" ]; then
    echo "  🔥 Removing InstallReferrer from expo-application..."
    
    find node_modules/expo-application/android/src -type f \( -name "*.java" -o -name "*.kt" \) -exec sed -i \
        -e 's/^import com\.android\.installreferrer/\/\/ FOSS: import com.android.installreferrer/g' \
        {} +
    
    echo "  ✅ InstallReferrer code removed from expo-application"
fi

# ==================================================
# 📦 Minimal compile-only stubs (NOT included in APK)
# ==================================================
echo ""
echo "📦 Creating minimal compile-only stubs..."

# These stubs are ONLY for compilation - Gradle will exclude them from APK
COMPILE_STUBS_DIR="android/app/src/debug/java"
mkdir -p "$COMPILE_STUBS_DIR/com/google/firebase/messaging"
mkdir -p "$COMPILE_STUBS_DIR/com/google/firebase/encoders"
mkdir -p "$COMPILE_STUBS_DIR/com/google/firebase/encoders/config"
mkdir -p "$COMPILE_STUBS_DIR/com/google/firebase/encoders/proto"
mkdir -p "$COMPILE_STUBS_DIR/com/google/android/gms/tasks"
mkdir -p "$COMPILE_STUBS_DIR/com/android/installreferrer/api"

# Minimal Firebase stubs (in debug sourceSet only)
cat > "$COMPILE_STUBS_DIR/com/google/firebase/messaging/FirebaseMessagingService.java" <<'EOF'
package com.google.firebase.messaging;
public class FirebaseMessagingService {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/messaging/RemoteMessage.java" <<'EOF'
package com.google.firebase.messaging;
public class RemoteMessage {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/messaging/FirebaseMessaging.java" <<'EOF'
package com.google.firebase.messaging;
public class FirebaseMessaging {
    public static FirebaseMessaging getInstance() { return new FirebaseMessaging(); }
}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/DataEncoder.java" <<'EOF'
package com.google.firebase.encoders;
public interface DataEncoder {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/ObjectEncoder.java" <<'EOF'
package com.google.firebase.encoders;
public interface ObjectEncoder<T> {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/ObjectEncoderContext.java" <<'EOF'
package com.google.firebase.encoders;
public interface ObjectEncoderContext {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/FieldDescriptor.java" <<'EOF'
package com.google.firebase.encoders;
public final class FieldDescriptor {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/EncodingException.java" <<'EOF'
package com.google.firebase.encoders;
public class EncodingException extends Exception {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/config/EncoderConfig.java" <<'EOF'
package com.google.firebase.encoders.config;
public interface EncoderConfig<T> {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/config/Configurator.java" <<'EOF'
package com.google.firebase.encoders.config;
public interface Configurator {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/proto/ProtoEnum.java" <<'EOF'
package com.google.firebase.encoders.proto;
public @interface ProtoEnum {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/firebase/encoders/proto/ProtobufEncoder.java" <<'EOF'
package com.google.firebase.encoders.proto;
public class ProtobufEncoder {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/android/gms/tasks/Task.java" <<'EOF'
package com.google.android.gms.tasks;
public abstract class Task<TResult> {}
EOF

cat > "$COMPILE_STUBS_DIR/com/google/android/gms/tasks/OnCompleteListener.java" <<'EOF'
package com.google.android.gms.tasks;
public interface OnCompleteListener<TResult> {}
EOF

cat > "$COMPILE_STUBS_DIR/com/android/installreferrer/api/InstallReferrerClient.java" <<'EOF'
package com.android.installreferrer.api;
public abstract class InstallReferrerClient {
    public static Builder newBuilder(android.content.Context context) { return null; }
    public static class Builder {
        public InstallReferrerClient build() { return null; }
    }
}
EOF

cat > "$COMPILE_STUBS_DIR/com/android/installreferrer/api/InstallReferrerStateListener.java" <<'EOF'
package com.android.installreferrer.api;
public interface InstallReferrerStateListener {}
EOF

echo "  ✅ Compile-only stubs created (in debug sourceSet - NOT in release APK)"

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

# 7. Patching Gradle for F-Droid Compliance (ULTRA CRITICAL)
echo ""
echo "🔧 Patching Gradle for F-Droid Compliance (AGGRESSIVE EXCLUSIONS)..."

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
    
    // Force remove Firebase at resolution time
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group.startsWith('com.google.firebase')) {
                    details.useVersion('')
                }
                if (details.requested.group.startsWith('com.google.android.gms')) {
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
// F-Droid FOSS Patch: Exclude proprietary code from APK
// ==================================================
android {
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
    
    // CRITICAL: Use only main sourceSet for release builds
    // Debug sourceSet (with stubs) is NOT included in release APK
    sourceSets {
        release {
            java.srcDirs = ['src/main/java']
        }
    }
}

configurations.all {
    exclude group: 'com.google.firebase'
    exclude group: 'com.google.android.gms'
    exclude group: 'com.android.installreferrer'
}

configurations.configureEach {
    exclude group: 'com.google.firebase'
    exclude group: 'com.google.android.gms'
    exclude group: 'com.android.installreferrer'
}
EOF

echo "  ✅ Gradle patched with AGGRESSIVE exclusions"

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
echo "🔍 NEW Approach applied:"
echo "  ✅ Firebase CODE DELETED from expo modules"
echo "  ✅ Stubs in DEBUG sourceSet only (NOT in release APK)"
echo "  ✅ Gradle AGGRESSIVE exclusions configured"
echo "  ✅ Runtime classpath excludes Firebase/GMS"
echo "  ✅ Vision Camera FOSS fork integrated"
echo ""
echo "🚀 Ready for F-Droid build (stubs WILL NOT be in APK)!"
