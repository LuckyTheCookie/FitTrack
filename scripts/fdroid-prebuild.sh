#!/usr/bin/env bash
set -e

# FitTrack F-Droid Prebuild Script
# Flavor: FOSS (com.fittrack.app.foss)

echo "=================================================="
echo "🔨 FitTrack F-Droid Prebuild Script (FOSS)"
echo "=================================================="

# 1. Environment Setup
if [ -z "$SOURCE_DATE_EPOCH" ]; then
    export SOURCE_DATE_EPOCH=$(date +%s)
fi
export EXPO_PUBLIC_BUILD_FLAVOR=foss
ROOT_DIR="$(pwd)"

# 2. Configure app.json for FOSS Package
echo "📝 Configuring app.json for F-Droid build..."
# On utilise node pour injecter proprement le package .foss
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

// DEFINIR LE PACKAGE NAME FOSS ICI
const fossPackage = 'com.fittrack.app.foss';
appJson.expo.android.package = fossPackage;
// On garde le bundle iOS standard (pas pertinent pour F-Droid mais propre)
appJson.expo.ios.bundleIdentifier = 'com.fittrack.app';

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log('✅ app.json updated with package: ' + fossPackage);
"

# 3. Install dependencies & Generate Native Code
echo ""
echo "📦 Installing dependencies..."
# NOTE: Sur les serveurs officiels F-Droid, ceci échouera si l'accès réseau est bloqué.
# Assure-toi que les dépendances sont gérées (vendoring) ou que le serveur autorise le réseau.
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
fi
bun install --frozen-lockfile

echo "🔧 Running Expo prebuild (Clean & Generate Android)..."
# --clean est crucial pour regénérer le dossier android avec le NOUVEAU package name
bunx expo prebuild --clean --platform android

# 4. Patching Native Files (Dynamic Path Finding)
echo ""
echo "🏥 Patching Health Connect configuration..."

ANDROID_MAIN_DIR="android/app/src/main"
PATCHES_DIR="scripts/android-patches"

# ASTUCE : Puisqu'on a changé le package name en .foss, Expo a probablement 
# déplacé MainActivity.kt dans un dossier .../foss/. On le cherche dynamiquement.
MAIN_ACTIVITY_PATH=$(find "$ANDROID_MAIN_DIR/java" -name "MainActivity.kt" | head -n 1)

if [ -f "$MAIN_ACTIVITY_PATH" ]; then
  echo "  📍 Found MainActivity at: $MAIN_ACTIVITY_PATH"
  
  # Copie du patch si disponible
  if [ -f "$PATCHES_DIR/MainActivity.kt.patch" ]; then
    # Attention: le patch doit avoir le bon "package com.fittrack.app.foss" en haut
    # Ou alors on copie le contenu. Si ton patch est un fichier complet, 
    # assure-toi qu'il a la bonne ligne 'package'.
    # Ici, on assume que ton patch est intelligent ou qu'on écrase.
    
    # Sécurité : on lit le package du fichier généré pour le remettre dans le patch si besoin
    CURRENT_PACKAGE_LINE=$(grep "^package " "$MAIN_ACTIVITY_PATH")
    
    cp "$PATCHES_DIR/MainActivity.kt.patch" "$MAIN_ACTIVITY_PATH"
    
    # On s'assure que la ligne package est correcte dans le fichier final
    # (Au cas où ton patch aurait l'ancien package 'com.fittrack.app' en dur)
    sed -i "s/^package .*/$CURRENT_PACKAGE_LINE/" "$MAIN_ACTIVITY_PATH"
    
    echo "  ✅ MainActivity.kt patched successfully"
  fi
else
  echo "  ⚠️  MainActivity.kt NOT FOUND - Prebuild might have failed"
  exit 1
fi

# Copie des autres fichiers (PermissionsRationaleActivity)
# On les met dans le même dossier que le MainActivity trouvé
DEST_DIR=$(dirname "$MAIN_ACTIVITY_PATH")
if [ -f "$PATCHES_DIR/PermissionsRationaleActivity.kt" ]; then
  cp "$PATCHES_DIR/PermissionsRationaleActivity.kt" "$DEST_DIR/PermissionsRationaleActivity.kt"
  # Fixer le package name dans ce fichier aussi
  CURRENT_PACKAGE_NAME=$(echo "$CURRENT_PACKAGE_LINE" | sed 's/package //;s/;//')
  sed -i "s/^package .*/package $CURRENT_PACKAGE_NAME/" "$DEST_DIR/PermissionsRationaleActivity.kt"
  echo "  ✅ PermissionsRationaleActivity.kt copied and package updated"
fi

# 5. Patch AndroidManifest (Health Connect)
# On utilise le script JS s'il existe, sinon fallback
MANIFEST_PATH="$ANDROID_MAIN_DIR/AndroidManifest.xml"
if [ -f "scripts/patch-health-connect.js" ]; then
  node "scripts/patch-health-connect.js" "$MANIFEST_PATH"
  echo "  ✅ AndroidManifest.xml patched via script"
fi

# 6. Cleanup Google Services
echo ""
echo "🧹 Ensuring Google Services are gone..."
if [ -f "android/build.gradle" ]; then
  sed -i "/com\.google\.gms:google-services/d" "android/build.gradle"
fi
if [ -f "android/app/build.gradle" ]; then
  sed -i "/apply plugin: 'com\.google\.gms\.google-services'/d" "android/app/build.gradle"
fi
rm -f "android/app/google-services.json"

echo "✅ F-Droid prebuild phase complete."

# --- PATCH CRITIQUE POUR F-DROID CLEANER ---


echo "🔧 Patching root directory for Gradle detection..."

# Création du settings.gradle (déjà fait, on garde)
rm -f settings.gradle
touch settings.gradle

# CRITIQUE : Création d'un build.gradle avec une tâche clean fictive
cat > build.gradle <<EOF
// Fichier généré pour satisfaire le cleaner F-Droid
task clean {
    doLast {
        println "Clean dummy task executed"
    }
}
EOF

echo "✅ Created dummy build.gradle with clean task"

echo "☢️  F-Droid Clean-up : Suppression TOTALE de Google GMS & Firebase..."

cat >> android/build.gradle <<EOF

// Ce bloc s'applique à TOUS les modules (app, vision-camera, expo-notifications, etc.)
allprojects {
    configurations.all {
        // Exclusion impitoyable de tout ce qui est Google proprio
        exclude group: 'com.google.firebase'
        exclude group: 'com.google.android.gms'
        exclude group: 'com.android.installreferrer'
        exclude group: 'com.google.mlkit'
        
        // On force aussi la résolution vers des versions vides si jamais ils reviennent
        resolutionStrategy {
            eachDependency { DependencyResolveDetails details ->
                if (details.requested.group == 'com.google.firebase' ||
                    details.requested.group == 'com.google.android.gms' ||
                    details.requested.group == 'com.android.installreferrer' ||
                    details.requested.group == 'com.google.mlkit') {
                        // On remplace par une dépendance bidon vide ou on rejette
                        details.useTarget("com.google.guava:guava:99.9-jre") // Hack: remplacer par un truc safe (mais risqué)
                        // Mieux : Juste laisser l'exclude faire son travail, mais ici on s'assure que subprojects l'ont.
                }
            }
        }
    }
    
    // Désactiver les métadonnées pour tous les sous-projets qui appliquent le plugin android
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            project.android {
                dependenciesInfo {
                    includeInApk = false
                    includeInBundle = false
                }
            }
        }
    }
}
EOF
