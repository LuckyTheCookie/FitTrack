#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- INPUTS & CONFIG ---
// On récupère les inputs depuis l'environnement GitHub Actions
const KEYSTORE_PASSWORD = process.env.KEYSTORE_PASSWORD; 
const KEYSTORE_ALIAS = process.env.KEYSTORE_ALIAS;
const TARGET_FLAVOR = process.env.TARGET_FLAVOR || 'standard'; // 'standard', 'foss', 'both'
const OVERRIDE_VERSION = process.env.OVERRIDE_VERSION; // Peut être vide

const APP_JSON = "app.json";
const VERSION_FILE = "package.json";

const BUILD_FLAVORS = {
  standard: {
    name: 'Standard',
    envVar: 'EXPO_PUBLIC_BUILD_FLAVOR=standard',
    apkSuffix: '',
    includeGoogleServices: true,
    splitByAbi: true,
  },
  foss: {
    name: 'FOSS',
    envVar: 'EXPO_PUBLIC_BUILD_FLAVOR=foss',
    apkSuffix: '-foss',
    includeGoogleServices: false,
    splitByAbi: true,
  }
};

// --- HELPERS ---

async function updateJsonFile(filePath, updater) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  const object = JSON.parse(content);
  const newObject = updater(object);
  await fs.promises.writeFile(filePath, JSON.stringify(newObject, null, 2) + '\n', 'utf8');
}

function semverParse(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function computeVersionCode(version) {
  const sem = semverParse(version);
  if (!sem) throw new Error('Invalid version format (X.Y.Z expected): ' + version);
  return sem.major * 10000 + sem.minor * 100 + sem.patch;
}

// --- PATCH FUNCTIONS ---

async function patchGoogleServices(rootDir) {
  console.log(`🔥 Patching Google Services...`);
  const appBuildGradlePath = path.join(rootDir, 'android/app/build.gradle');
  const projectBuildGradlePath = path.join(rootDir, 'android/build.gradle');
  
  // 1. Project Build Gradle
  let projectBuildGradle = await fs.promises.readFile(projectBuildGradlePath, 'utf8');
  if (!projectBuildGradle.includes('com.google.gms:google-services')) {
    projectBuildGradle = projectBuildGradle.replace(
      /dependencies\s*\{/,
      `dependencies {\n    classpath('com.google.gms:google-services:4.4.1')`
    );
    await fs.promises.writeFile(projectBuildGradlePath, projectBuildGradle, 'utf8');
  }
  
  // 2. App Build Gradle
  let appBuildGradle = await fs.promises.readFile(appBuildGradlePath, 'utf8');
  if (!appBuildGradle.includes('com.google.gms.google-services')) {
    appBuildGradle = appBuildGradle.trimEnd() + '\n\napply plugin: \'com.google.gms.google-services\'\n';
    await fs.promises.writeFile(appBuildGradlePath, appBuildGradle, 'utf8');
  }

  // 3. Move JSON
  // En CI, on suppose que le JSON a été décodé à la racine "google-services.json"
  if (fs.existsSync(path.join(rootDir, 'google-services.json'))) {
      await fs.promises.copyFile(
        path.join(rootDir, 'google-services.json'),
        path.join(rootDir, 'android/app/google-services.json')
      );
  }
}

async function patchHealthConnect(rootDir) {
  console.log(`🏥 Patching Health Connect...`);
  const patchesDir = path.join(rootDir, 'scripts/android-patches');
  const androidMainDir = path.join(rootDir, 'android/app/src/main');
  const kotlinDir = path.join(androidMainDir, 'java/com/spix/app');
  const manifestPath = path.join(androidMainDir, 'AndroidManifest.xml');

  // Copie des fichiers Kotlin (s'ils existent dans le repo)
  if(fs.existsSync(patchesDir)) {
      if(fs.existsSync(path.join(patchesDir, 'MainActivity.kt.patch'))) {
          await fs.promises.copyFile(
            path.join(patchesDir, 'MainActivity.kt.patch'),
            path.join(kotlinDir, 'MainActivity.kt')
          );
      }
      if(fs.existsSync(path.join(patchesDir, 'PermissionsRationaleActivity.kt'))) {
          await fs.promises.copyFile(
            path.join(patchesDir, 'PermissionsRationaleActivity.kt'),
            path.join(kotlinDir, 'PermissionsRationaleActivity.kt')
          );
      }
  }

  // Patch Manifest (Ton code Regex original)
  if (fs.existsSync(manifestPath)) {
    let manifest = await fs.promises.readFile(manifestPath, 'utf8');
    if (!manifest.includes('ACTION_SHOW_PERMISSIONS_RATIONALE')) {
      const mainActivityIntentFilter = `
      <!-- Health Connect: For Android 13 and below -->
      <intent-filter>
        <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
      </intent-filter>`;
      manifest = manifest.replace(/(<activity[^>]*android:name="\.MainActivity"[^>]*>[\s\S]*?<\/intent-filter>)/, `$1${mainActivityIntentFilter}`);
      
      const rationaleActivity = `
    <activity android:name=".PermissionsRationaleActivity" android:exported="true">
      <intent-filter><action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" /></intent-filter>
    </activity>
    <activity-alias android:name="ViewPermissionUsageActivity" android:exported="true" android:targetActivity=".MainActivity" android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
      <intent-filter><action android:name="android.intent.action.VIEW_PERMISSION_USAGE" /><category android:name="android.intent.category.HEALTH_PERMISSIONS" /></intent-filter>
    </activity-alias>`;
      manifest = manifest.replace('</application>', `${rationaleActivity}\n  </application>`);
      
      if (!manifest.includes('com.google.android.apps.healthdata')) {
        manifest = manifest.replace(/<queries>([\s\S]*?)<\/queries>/, `<queries>$1\n    <package android:name="com.google.android.apps.healthdata" />\n  </queries>`);
      }
      await fs.promises.writeFile(manifestPath, manifest, 'utf8');
      console.log("   ✅ Manifest patched.");
    }
  }
}

async function injectGradleConfig(rootDir, enableSplits) {
  // CRITIQUE EN CI: On récupère le keystore temporaire (spix.p12.tmp) et on le met là où Gradle le veut
  const tempKeystore = path.join(rootDir, 'spix.p12.tmp');
  const destKeystore = path.join(rootDir, 'android/app/spix.p12');
  
  if (fs.existsSync(tempKeystore)) {
      await fs.promises.copyFile(tempKeystore, destKeystore);
      console.log("   🔑 Keystore injected into android/app.");
  } else {
      console.warn("   ⚠️ Keystore temp file not found. Signing might fail if not debug.");
  }

  const buildGradlePath = path.join(rootDir, 'android/app/build.gradle');
  let buildGradle = await fs.promises.readFile(buildGradlePath, 'utf8');

  // 1. Signing Config
  const signingBlock = `
    signingConfigs {
        release {
            storeFile file("spix.p12")
            storePassword "${KEYSTORE_PASSWORD}"
            keyAlias "${KEYSTORE_ALIAS}"
            keyPassword "${KEYSTORE_PASSWORD}"
            storeType "pkcs12"
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
  `;
  if (!buildGradle.includes('storeType "pkcs12"')) {
    buildGradle = buildGradle.replace('android {', `android {${signingBlock}`);
  }

  // 2. Apply to Release
  // On nettoie d'abord si une config debug traine
  const releaseBlockRegex = /(buildTypes\s*\{[\s\S]*?release\s*\{)([\s\S]*?)(\}\s*)/;
  if (releaseBlockRegex.test(buildGradle)) {
      buildGradle = buildGradle.replace(releaseBlockRegex, (match, start, content, end) => {
          return `${start}${content.replace(/^\s*signingConfig signingConfigs\.debug\s*$/gm, '')}${end}`;
      });
  }
  
  if (!buildGradle.includes('signingConfig signingConfigs.release')) {
     buildGradle = buildGradle.replace(
        releaseBlockRegex, 
        '$1\n            signingConfig signingConfigs.release$2$3'
      );
  }

  // 3. Splits
  if (enableSplits) {
    const splitsBlock = `
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a", "armeabi-v7a", "x86", "x86_64"
            universalApk false
        }
    }
    `;
    if(!buildGradle.includes('splits {')) {
        buildGradle = buildGradle.replace('android {', `android {${splitsBlock}`);
    }
  }

  await fs.promises.writeFile(buildGradlePath, buildGradle, 'utf8');
}

async function configureForFlavor(appJsonPath, flavor, version) {
  const flavorConfig = BUILD_FLAVORS[flavor];
  await updateJsonFile(appJsonPath, (obj) => {
    const code = computeVersionCode(version);
    if (!obj.expo) obj.expo = {};
    obj.expo.version = version;
    obj.expo.android = obj.expo.android || {};
    obj.expo.android.versionCode = code;
    obj.expo.extra = obj.expo.extra || {};
    obj.expo.extra.buildFlavor = flavor;
    
    // On retire la ref au fichier googleServices ici, car on l'injecte manuellement via patchGoogleServices
    // pour éviter qu'Expo ne plante s'il le trouve pas au prebuild
    delete obj.expo.android.googleServicesFile;

    const existingBlocked = Array.isArray(obj.expo.android.blockedPermissions)
      ? obj.expo.android.blockedPermissions
      : [];

    const existingPermissions = Array.isArray(obj.expo.android.permissions)
      ? obj.expo.android.permissions
      : [];

    const permissionsWithoutInternet = existingPermissions.filter(
      (permission) => permission !== 'android.permission.INTERNET'
    );

    obj.expo.android.permissions = flavor === 'foss'
      ? permissionsWithoutInternet
      : [...new Set([...permissionsWithoutInternet, 'android.permission.INTERNET'])];

    const withoutInternet = existingBlocked.filter(
      (permission) => permission !== 'android.permission.INTERNET'
    );

    obj.expo.android.blockedPermissions = flavor === 'foss'
      ? [...withoutInternet, 'android.permission.INTERNET']
      : withoutInternet;
    
    return obj;
  });
}

async function buildFlavor(rootDir, flavor, version) {
  const flavorConfig = BUILD_FLAVORS[flavor];
  console.log(`\n🔨 -------------------------------------------`);
  console.log(`🔨 BUILDING FLAVOR: ${flavorConfig.name} (${version})`);
  console.log(`🔨 -------------------------------------------`);

  // 1. Config App.json
  await configureForFlavor(path.join(rootDir, APP_JSON), flavor, version);

  // 2. Expo Prebuild (Clean)
  try {
      console.log("📦 Running Expo Prebuild...");
      execSync(`${flavorConfig.envVar} bunx expo prebuild --clean --platform android`, { 
        stdio: 'inherit', cwd: rootDir,
        env: { ...process.env, EXPO_PUBLIC_BUILD_FLAVOR: flavor }
      });
  } catch(e) { console.error("❌ Prebuild failed"); process.exit(1); }

  // 3. Patching
  await injectGradleConfig(rootDir, flavorConfig.splitByAbi);
  await patchHealthConnect(rootDir);
  if (flavorConfig.includeGoogleServices) {
    await patchGoogleServices(rootDir);
  }

  // 4. Build Gradle
  try {
      console.log("🚀 Compiling APK...");
      execSync('./gradlew assembleRelease', { 
        stdio: 'inherit', cwd: path.join(rootDir, 'android'),
        env: { ...process.env, EXPO_PUBLIC_BUILD_FLAVOR: flavor }
      });
  } catch(e) { console.error("❌ Gradle Build failed"); process.exit(1); }

  // 5. Move Artifacts
  const apkDir = path.join(rootDir, 'android/app/build/outputs/apk/release');
  const releasesDir = path.join(rootDir, 'releases');
    if (!fs.existsSync(releasesDir)) {
    await fs.promises.mkdir(releasesDir, { recursive: true });
    }

  if (fs.existsSync(apkDir)) {
      const apks = (await fs.promises.readdir(apkDir)).filter(f => f.endsWith('.apk') && !f.includes('metadata'));
      await Promise.all(apks.map(async (apk) => {
          let archSuffix = '';
          const archMatch = apk.match(/(arm64-v8a|armeabi-v7a|x86_64|x86)/);
          if (archMatch) archSuffix = `-${archMatch[1]}`;
          
          const newName = `Spix-${version}${flavorConfig.apkSuffix}${archSuffix}.apk`;
          await fs.promises.rename(path.join(apkDir, apk), path.join(releasesDir, newName));
          console.log(`✅ Artifact ready: releases/${newName}`);
      }));
  } else {
      console.error("⚠️ No APK found in output folder.");
  }
}

// --- MAIN LOOP ---

async function main() {
    const rootDir = path.resolve(__dirname, '..');
    
    // 1. GESTION VERSION
    let currentVersion = require(path.join(rootDir, VERSION_FILE)).version;
    let finalVersion = currentVersion;

    if (OVERRIDE_VERSION && OVERRIDE_VERSION.trim() !== "") {
        finalVersion = OVERRIDE_VERSION.trim();
        console.log(`🆙 Overriding version to: ${finalVersion}`);
      await updateJsonFile(path.join(rootDir, VERSION_FILE), o => { o.version = finalVersion; return o; });
    } else {
        console.log(`ℹ️ Using current package.json version: ${finalVersion}`);
    }

    // Communiquer la version finale à GitHub Actions (pour le tag de la release)
    if (process.env.GITHUB_OUTPUT) {
        await fs.promises.appendFile(process.env.GITHUB_OUTPUT, `final_version=${finalVersion}\n`);
    }

    // 2. BUILD
    // Si on fait les deux, on commence souvent par Standard
    if (TARGET_FLAVOR === 'both' || TARGET_FLAVOR === 'standard') {
        await buildFlavor(rootDir, 'standard', finalVersion);
    }
    
    if (TARGET_FLAVOR === 'both' || TARGET_FLAVOR === 'foss') {
        // Important: Reset du dossier android pour éviter les conflits de plugins (Google Services vs FOSS)
        // Expo prebuild le recréera
        if (fs.existsSync(path.join(rootDir, 'android'))) {
        await fs.promises.rm(path.join(rootDir, 'android'), { recursive: true, force: true });
        }
        await buildFlavor(rootDir, 'foss', finalVersion);
    }
}

  main().catch((error) => {
    console.error('❌ CI build script failed', error);
    process.exit(1);
  });
