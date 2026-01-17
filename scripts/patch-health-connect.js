#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: node patch-health-connect.js <AndroidManifest.xml path>');
  process.exit(2);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

if (manifest.includes('ACTION_SHOW_PERMISSIONS_RATIONALE')) {
  console.log('  ℹ️  Health Connect already configured in manifest');
  process.exit(0);
}

const mainActivityIntentFilter = `\n      <!-- Health Connect: For Android 13 and below -->\n      <intent-filter>\n        <action android:name=\"androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE\" />\n      </intent-filter>\n`;

// Insert intent-filter into MainActivity
const mainActivityRegex = /(<activity[^>]*android:name=\"\.MainActivity\"[^>]*>)([\s\S]*?)(<\/activity>)/;
const m = manifest.match(mainActivityRegex);
if (m) {
  let activityBlock = m[0];
  const lastIntentFilterClose = activityBlock.lastIndexOf('</intent-filter>');
  if (lastIntentFilterClose !== -1) {
    // insert after last </intent-filter>
    const insertPos = m.index + lastIntentFilterClose + '</intent-filter>'.length;
    manifest = manifest.slice(0, insertPos) + mainActivityIntentFilter + manifest.slice(insertPos);
  } else {
    // insert right after opening activity tag
    const openingEnd = activityBlock.indexOf('>');
    const insertPos = m.index + openingEnd + 1;
    manifest = manifest.slice(0, insertPos) + mainActivityIntentFilter + manifest.slice(insertPos);
  }
  console.log('  ✅ Inserted intent-filter into MainActivity');
} else {
  console.warn('  ⚠️  Could not find MainActivity activity block to patch');
}

// Add PermissionsRationaleActivity and activity-alias before </application>
const rationaleActivity = `\n    <!-- Health Connect: Permissions Rationale Activity for Android 13 and below -->\n    <activity\n      android:name=\".PermissionsRationaleActivity\"\n      android:exported=\"true\">\n      <intent-filter>\n        <action android:name=\"androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE\" />\n      </intent-filter>\n    </activity>\n\n    <!-- Health Connect: Activity alias for Android 14+ -->\n    <activity-alias\n      android:name=\"ViewPermissionUsageActivity\"\n      android:exported=\"true\"\n      android:targetActivity=\".MainActivity\"\n      android:permission=\"android.permission.START_VIEW_PERMISSION_USAGE\">\n      <intent-filter>\n        <action android:name=\"android.intent.action.VIEW_PERMISSION_USAGE\" />\n        <category android:name=\"android.intent.category.HEALTH_PERMISSIONS\" />\n      </intent-filter>\n    </activity-alias>\n`;

if (manifest.includes('</application>')) {
  manifest = manifest.replace('</application>', `${rationaleActivity}\n  </application>`);
  console.log('  ✅ Added PermissionsRationaleActivity and activity-alias');
} else {
  console.warn('  ⚠️  Could not find </application> to insert rationale activity');
}

// Add queries for Health Connect package
if (manifest.includes('<queries>')) {
  if (!manifest.includes('com.google.android.apps.healthdata')) {
    manifest = manifest.replace(/<queries>([\s\S]*?)<\/queries>/, (all, inner) => {
      return `<queries>${inner}\n    <package android:name=\"com.google.android.apps.healthdata\" />\n  </queries>`;
    });
    console.log('  ✅ Added Health Connect package to existing <queries>');
  }
} else {
  // Insert queries before <application>
  if (manifest.includes('<application')) {
    manifest = manifest.replace(/(<application[\s\S]*?>)/, `<queries>\n    <package android:name=\"com.google.android.apps.healthdata\" />\n  </queries>\n$1`);
    console.log('  ✅ Added new <queries> block for Health Connect');
  } else {
    console.warn('  ⚠️  Could not find <application> to insert <queries>');
  }
}

fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('  ✅ AndroidManifest.xml patched for Health Connect');
process.exit(0);
