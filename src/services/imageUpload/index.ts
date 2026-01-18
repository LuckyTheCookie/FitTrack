// ============================================================================
// IMAGE UPLOAD SERVICE - Upload temporaire d'images
// Utilise tmpfiles.org (fichiers supprimés après 1 heure max)
// Utilise la nouvelle API File de expo-file-system (SDK 54+)
// ============================================================================

import { File, Paths } from 'expo-file-system';

// tmpfiles.org - fichiers supprimés après 1 heure
const TMPFILES_UPLOAD_URL = 'https://tmpfiles.org/api/v1/upload';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface TmpFilesResponse {
  status: string;
  data: {
    url: string;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Détermine le type MIME à partir de l'URI
 */
const getMimeType = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
};

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload une image vers tmpfiles.org
 * Les fichiers sont automatiquement supprimés après 1 heure
 * 
 * @param imageUri URI locale de l'image (ex: file:///...)
 * @returns URL publique de l'image
 */
export const uploadImageToTmpFiles = async (imageUri: string): Promise<UploadResult> => {
  try {
    console.log('[ImageUpload] Starting upload to tmpfiles.org:', imageUri);
    
    // Utiliser la nouvelle API File pour vérifier l'existence
    const file = new File(imageUri);
    
    if (!file.exists) {
      throw new Error('Image file not found');
    }
    
    // Extraire le nom du fichier
    const fileName = file.name || 'image.jpg';
    const mimeType = getMimeType(imageUri);
    
    // Créer le FormData pour l'upload
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: mimeType,
    } as any);
    
    console.log('[ImageUpload] Uploading file:', fileName, 'MIME:', mimeType, 'Size:', file.size);
    
    const response = await fetch(TMPFILES_UPLOAD_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ImageUpload] Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result: TmpFilesResponse = await response.json();
    console.log('[ImageUpload] Upload response:', result);
    
    if (result.status !== 'success' || !result.data?.url) {
      throw new Error('Invalid response from tmpfiles.org');
    }
    
    // tmpfiles.org retourne une URL de la forme https://tmpfiles.org/1234567/image.jpg
    // On doit la convertir en https://tmpfiles.org/dl/1234567/image.jpg pour avoir un lien direct
    const directUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    
    console.log('[ImageUpload] Upload successful:', directUrl);
    
    return {
      success: true,
      url: directUrl,
    };
  } catch (error) {
    console.error('[ImageUpload] Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

/**
 * Upload une image depuis base64
 */
export const uploadBase64Image = async (base64Data: string, fileName: string = 'image.jpg'): Promise<UploadResult> => {
  try {
    console.log('[ImageUpload] Uploading base64 image...');
    
    // Créer un fichier temporaire avec la nouvelle API
    const tempFile = new File(Paths.cache, fileName);
    
    // Décoder base64 et écrire dans le fichier
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    tempFile.write(bytes);
    
    // Upload le fichier temporaire
    const result = await uploadImageToTmpFiles(tempFile.uri);
    
    // Nettoyer le fichier temporaire
    try {
      tempFile.delete();
    } catch {
      // Ignorer les erreurs de nettoyage
    }
    
    return result;
  } catch (error) {
    console.error('[ImageUpload] Base64 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};
