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

// Set FOSS flavor config
appJson.expo.extra = appJson.expo.extra || {};
appJson.expo.extra.buildFlavor = 'foss';

// Remove Google Services
if (appJson.expo.android && appJson.expo.android.googleServicesFile) {
  delete appJson.expo.android.googleServicesFile;
}

// Define FOSS package name
const fossPackage = 'com.fittrack.app.foss';
appJson.expo.android.package = fossPackage;
appJson.expo.ios.bundleIdentifier = 'com.fittrack.app';

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log('✅ app.json updated with package: ' + fossPackage);
"

# 3. Install dependencies & Generate Native Code
echo ""
echo "📦 Installing dependencies..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
fi
bun install --frozen-lockfile

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

# ==================================================
# ☢️  SECTION CRITIQUE : PATCHING F-DROID / GOOGLE
# ==================================================

echo "--------------------------------------------------"
echo "🔧 Patching Gradle for F-Droid Compliance"
echo "--------------------------------------------------"

# 7. Patching Gradle Exclusion (Suppression TOTALE de Google)
# On écrit dans le fichier RACINE pour affecter TOUS les modules
cat >> android/build.gradle <<EOF

// F-Droid Patch: Global Exclusion of Proprietary Libraries
allprojects {
    configurations.all {
        exclude group: 'com.google.firebase'
        exclude group: 'com.google.android.gms'
        exclude group: 'com.android.installreferrer'
        // On exclut ML Kit globalement
        exclude group: 'com.google.mlkit'
    }
}
EOF
echo "  ✅ Added Global Excludes to android/build.gradle"

# 8. Patching App Gradle (Metadata)
# On écrit dans le fichier APP pour les options Android
cat >> android/app/build.gradle <<EOF

// F-Droid Patch: Disable dependency metadata (extra signing block error)
android {
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
}
EOF
echo "  ✅ Disabled dependenciesInfo in android/app/build.gradle"

# 9. SABOTAGE de Vision Camera (Fix Compilation Error)
echo "--------------------------------------------------"
echo "🔪 Patching Vision Camera Source Code (Removing ML Kit)"
echo "--------------------------------------------------"

VC_PATH="node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera"

# A. Suppression des fichiers qui ne servent qu'au scanner
rm -f "$VC_PATH/core/CodeScannerPipeline.kt"
rm -f "$VC_PATH/core/types/CodeType.kt"

# B. Nettoyage de CameraSession.kt
if [ -f "$VC_PATH/core/CameraSession.kt" ]; then
    sed -i 's/import com.mrousavy.camera.core.CodeScannerPipeline/\/\/ import com.mrousavy.camera.core.CodeScannerPipeline/' "$VC_PATH/core/CameraSession.kt"
    sed -i 's/import com.google.mlkit.vision.barcode.common.Barcode/\/\/ import com.google.mlkit.vision.barcode.common.Barcode/' "$VC_PATH/core/CameraSession.kt"
    sed -i 's/private var codeScannerPipeline: CodeScannerPipeline? = null/private var codeScannerPipeline: Any? = null/' "$VC_PATH/core/CameraSession.kt"
    sed -i 's/codeScannerPipeline = CodeScannerPipeline/codeScannerPipeline = null \/\/ CodeScannerPipeline/' "$VC_PATH/core/CameraSession.kt"
    sed -i 's/codeScannerPipeline?.close()/ \/\/ codeScannerPipeline?.close()/' "$VC_PATH/core/CameraSession.kt"
fi

# C. Nettoyage de CameraView+Events.kt
if [ -f "$VC_PATH/react/CameraView+Events.kt" ]; then
    sed -i 's/import com.google.mlkit.vision.barcode.common.Barcode/\/\/ import com.google.mlkit.vision.barcode.common.Barcode/' "$VC_PATH/react/CameraView+Events.kt"
    sed -i 's/import com.mrousavy.camera.core.types.CodeType/\/\/ import com.mrousavy.camera.core.types.CodeType/' "$VC_PATH/react/CameraView+Events.kt"
    # Désactivation de la signature de méthode (tricky regex)
    sed -i 's/fun onCodeScanned(codes: List<Barcode>, scannerFrame: CodeScannerFrame)/fun onCodeScanned(codes: List<Any>, scannerFrame: Any)/' "$VC_PATH/react/CameraView+Events.kt"
    # On commente le corps de la méthode si possible, ou on laisse planter à l'exécution (pas grave on l'appelle pas)
fi

# D. Nettoyage de CameraView.kt
if [ -f "$VC_PATH/react/CameraView.kt" ]; then
    sed -i 's/import com.google.mlkit.vision.barcode.common.Barcode/\/\/ import com.google.mlkit.vision.barcode.common.Barcode/' "$VC_PATH/react/CameraView.kt"
    sed -i 's/, CodeScannerPipeline.OutputListener//' "$VC_PATH/react/CameraView.kt"
    sed -i 's/override fun onCodeScanned(codes: List<Barcode>, scannerFrame: CodeScannerFrame)/fun onCodeScanned(codes: List<Any>, scannerFrame: Any)/' "$VC_PATH/react/CameraView.kt"
fi

echo "  ✅ Vision Camera source patched (CodeScanner neutered)"

# 10. Dummy build.gradle for F-Droid Cleaner
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
