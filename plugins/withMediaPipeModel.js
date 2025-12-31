// Expo config plugin to copy MediaPipe model to Android assets
const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const MODEL_NAME = 'pose_landmarker_lite.task';

async function downloadModel(destPath) {
    // Use dynamic import for fetch (Node 18+)
    const response = await fetch(MODEL_URL);
    if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    console.log(`[withMediaPipeModel] Downloaded ${MODEL_NAME} (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}

const withMediaPipeModel = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const assetsDir = path.join(
                projectRoot,
                'android',
                'app',
                'src',
                'main',
                'assets'
            );

            // Create assets directory if it doesn't exist
            if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true });
            }

            const modelPath = path.join(assetsDir, MODEL_NAME);

            // Download the model if it doesn't exist
            if (!fs.existsSync(modelPath)) {
                console.log(`[withMediaPipeModel] Downloading ${MODEL_NAME}...`);
                try {
                    await downloadModel(modelPath);
                } catch (error) {
                    console.error(`[withMediaPipeModel] Failed to download model:`, error.message);
                    console.log(`[withMediaPipeModel] Please manually download from: ${MODEL_URL}`);
                }
            } else {
                console.log(`[withMediaPipeModel] ${MODEL_NAME} already exists`);
            }

            return config;
        },
    ]);
};

module.exports = withMediaPipeModel;
