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


VC_PATH="node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera"

# A. On réécrit CodeScannerPipeline.kt avec une coquille vide
cat > "$VC_PATH/core/CodeScannerPipeline.kt" <<EOF
package com.mrousavy.camera.core
import android.util.Size
import com.mrousavy.camera.core.types.CodeScannerOptions

class CodeScannerPipeline(val options: CodeScannerOptions, val outputListener: OutputListener) {
    interface OutputListener {
        fun onCodeScanned(codes: List<Any>, scannerFrame: Any)
    }
    fun close() {}
}
EOF

# B. On réécrit CodeType.kt pour retirer les références ML Kit mais garder l'enum
cat > "$VC_PATH/core/types/CodeType.kt" <<EOF
package com.mrousavy.camera.core.types
enum class CodeType(override val unionValue: String): JSUnionValue {
    CODE_128("code-128"),
    CODE_39("code-39"),
    CODE_93("code-93"),
    CODABAR("codabar"),
    EAN_13("ean-13"),
    EAN_8("ean-8"),
    ITF("itf"),
    UPC_E("upc-e"),
    QR_CODE("qr"),
    PDF_417("pdf-417"),
    AZTEC("aztec"),
    DATA_MATRIX("data-matrix");

    fun toBarcodeType(): Int = 0 
    
    companion object {
        fun fromBarcodeType(barcodeType: Int): CodeType = QR_CODE
    }
}
interface JSUnionValue {
    val unionValue: String
}
EOF

# C. Patch de CameraSession.kt
# On commente l'import réel de Barcode s'il existe
sed -i 's/import com.google.mlkit.vision.barcode.common.Barcode/\/\/ import com.google.mlkit/' "$VC_PATH/core/CameraSession.kt"
# On remplace l'usage réel par du code mort
sed -i 's/codeScannerPipeline = CodeScannerPipeline.*/codeScannerPipeline = null \/\/ Disabled for FOSS/' "$VC_PATH/core/CameraSession.kt"

# D. Patch de CameraView+Events.kt
# On remplace les types List<Barcode> par List<Any> pour calmer le compilateur
sed -i 's/import com.google.mlkit.vision.barcode.common.Barcode/\/\/ import com.google.mlkit/' "$VC_PATH/react/CameraView+Events.kt"
sed -i 's/fun onCodeScanned(codes: List<Barcode>, scannerFrame: CodeScannerFrame)/fun onCodeScanned(codes: List<Any>, scannerFrame: Any)/' "$VC_PATH/react/CameraView+Events.kt"

# E. Patch de CameraView.kt
# Idem, on change la signature pour matcher notre interface modifiée dans CodeScannerPipeline
sed -i 's/import com.google.mlkit.vision.barcode.common.Barcode/\/\/ import com.google.mlkit/' "$VC_PATH/react/CameraView.kt"
sed -i 's/override fun onCodeScanned(codes: List<Barcode>, scannerFrame: CodeScannerFrame)/override fun onCodeScanned(codes: List<Any>, scannerFrame: Any)/' "$VC_PATH/react/CameraView.kt"

echo "  ✅ Vision Camera source patched (CodeScanner stubbed)"

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
