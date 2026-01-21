// ============================================================================
// POLLINATION API SERVICE - Analyse d'images de repas via LLM
// ============================================================================

import * as Linking from 'expo-linking';
import { zustandStorage } from '../../storage';

const POLLINATION_AUTH_URL = 'https://enter.pollinations.ai/authorize';
const POLLINATION_API_URL = 'https://gen.pollinations.ai/v1/chat/completions';
const STORAGE_KEY = 'pollination_api_key';

// ============================================================================
// TYPES
// ============================================================================

export interface MealAnalysis {
  score: number; // Score de 0 à 100
  title: string; // Titre du repas
  description: string; // Description de ce que l'utilisateur a mangé
  suggestions: string[]; // Suggestions d'amélioration
}

export interface PollinationResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// ============================================================================
// STORAGE
// ============================================================================

export const savePollinationApiKey = async (apiKey: string): Promise<void> => {
  try {
    await zustandStorage.setItem(STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('[Pollination] Error saving API key:', error);
    throw error;
  }
};

export const getPollinationApiKey = async (): Promise<string | null> => {
  try {
    const key = await zustandStorage.getItem(STORAGE_KEY);
    return key || null;
  } catch (error) {
    console.error('[Pollination] Error getting API key:', error);
    return null;
  }
};

export const removePollinationApiKey = async (): Promise<void> => {
  try {
    await zustandStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[Pollination] Error removing API key:', error);
  }
};

export const isPollinationConnected = async (): Promise<boolean> => {
  const key = await getPollinationApiKey();
  return key !== null && key.length > 0;
};

// ============================================================================
// ACCOUNT INFO
// ============================================================================

export interface PollinationAccountInfo {
  connected: boolean;
  balance?: number;
  error?: string;
}

/**
 * Récupère les informations du compte Pollination (balance, etc.)
 * Utilise l'endpoint /v1/balance si disponible
 */
export const getPollinationAccountInfo = async (): Promise<PollinationAccountInfo> => {
  const apiKey = await getPollinationApiKey();
  
  if (!apiKey) {
    return { connected: false };
  }
  
  try {
    // Essayer de récupérer la balance via l'API
    const response = await fetch('https://gen.pollinations.ai/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        balance: data.balance ?? data.pollen ?? data.credits,
      };
    }
    
    // Si l'endpoint balance n'existe pas, on retourne juste connected
    return { connected: true };
  } catch (error) {
    console.error('[Pollination] Error getting account info:', error);
    return { 
      connected: true, 
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// ============================================================================
// AUTH FLOW
// ============================================================================

/**
 * Génère l'URL d'autorisation Pollination
 * @param redirectUrl URL de redirection (scheme spix://)
 */
export const getPollinationAuthUrl = (redirectUrl: string): string => {
  const params = new URLSearchParams({
    redirect_url: redirectUrl,
    permissions: 'profile,balance',
    models: 'gemini',
    expiry: '30', // 30 jours
    budget: '50', // Budget en pollen
  });
  
  return `${POLLINATION_AUTH_URL}?${params.toString()}`;
};

/**
 * Ouvre la page d'autorisation Pollination dans le navigateur
 */
export const startPollinationAuth = async (): Promise<void> => {
  // Utilise le scheme spix:// pour le redirect
  const redirectUrl = Linking.createURL('pollination-callback');
  const authUrl = getPollinationAuthUrl(redirectUrl);
  
  console.log('[Pollination] Starting auth with redirect:', redirectUrl);
  console.log('[Pollination] Auth URL:', authUrl);
  
  await Linking.openURL(authUrl);
};

/**
 * Extrait la clé API du fragment de l'URL de callback
 * @param url URL complète avec fragment (#api_key=...)
 */
export const extractApiKeyFromUrl = (url: string): string | null => {
  try {
    // L'URL sera de la forme spix://pollination-callback#api_key=sk_abc123
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return null;
    
    const fragment = url.substring(hashIndex + 1);
    const params = new URLSearchParams(fragment);
    const apiKey = params.get('api_key');
    
    return apiKey;
  } catch (error) {
    console.error('[Pollination] Error extracting API key:', error);
    return null;
  }
};

// ============================================================================
// MEAL ANALYSIS
// ============================================================================

const SYSTEM_PROMPT = `Tu es Ploppy, un assistant nutritionnel bienveillant et expert. Tu analyses les photos de repas pour aider les utilisateurs à mieux manger.

Quand on te montre une photo de repas, tu dois répondre UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "score": <nombre de 0 à 100>,
  "title": "<titre court du repas en français, 3-5 mots max>",
  "description": "<description détaillée de ce que tu vois dans l'assiette, 2-3 phrases>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>", ...]
}

Le score évalue l'équilibre nutritionnel :
- 0-30: Repas déséquilibré (trop gras, trop sucré, peu nutritif)
- 30-50: Repas moyen, améliorations possibles
- 50-70: Bon repas, quelques ajustements suggérés
- 70-85: Très bon repas, bien équilibré
- 85-100: Excellent repas, exemplaire

Les suggestions doivent être :
- Constructives et bienveillantes
- Pratiques et faciles à mettre en œuvre
- En français, avec des émojis

IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

/**
 * Analyse une image de repas via Pollination/Gemini
 * @param imageUrl URL de l'image uploadée
 * @param additionalContext Informations complémentaires sur le repas (optionnel)
 * @returns Analyse du repas
 */
export const analyzeMealImage = async (imageUrl: string, additionalContext?: string): Promise<MealAnalysis> => {
  const apiKey = await getPollinationApiKey();
  
  if (!apiKey) {
    throw new Error('Pollination API key not found. Please connect to Pollination first.');
  }
  
  console.log('[Pollination] Analyzing meal image:', imageUrl);
  if (additionalContext) {
    console.log('[Pollination] Additional context:', additionalContext);
  }
  
  // Construire le message utilisateur avec le contexte additionnel
  let userMessage = 'Analyse cette photo de repas et donne-moi ton évaluation.';
  if (additionalContext && additionalContext.trim()) {
    userMessage += `\n\nInformations complémentaires de l'utilisateur: ${additionalContext.trim()}`;
  }
  
  const response = await fetch(POLLINATION_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userMessage,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Pollination] API error:', response.status, errorText);
    throw new Error(`Pollination API error: ${response.status}`);
  }
  
  const data: PollinationResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from Pollination API');
  }
  
  console.log('[Pollination] Raw response:', content);
  
  // Parse le JSON de la réponse
  try {
    // Nettoyer la réponse si elle contient des backticks markdown
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Extraire le JSON valide en cas de contenu supplémentaire
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    let jsonContent = jsonMatch[0];
    
    // Réparer les JSON incomplètement fermés (fermer les structures ouvertes)
    let braceCount = (jsonContent.match(/\{/g) || []).length - (jsonContent.match(/\}/g) || []).length;
    for (let i = 0; i < braceCount; i++) {
      jsonContent += '}';
    }
    
    let bracketCount = (jsonContent.match(/\[/g) || []).length - (jsonContent.match(/\]/g) || []).length;
    for (let i = 0; i < bracketCount; i++) {
      jsonContent += ']';
    }
    
    const analysis: MealAnalysis = JSON.parse(jsonContent);
    
    // Validation basique
    if (typeof analysis.score !== 'number' || analysis.score < 0 || analysis.score > 100) {
      analysis.score = 50;
    }
    if (!analysis.title) {
      analysis.title = 'Repas analysé';
    }
    if (!analysis.description) {
      analysis.description = 'Analyse en cours...';
    }
    if (!Array.isArray(analysis.suggestions)) {
      analysis.suggestions = [];
    }
    
    return analysis;
  } catch (parseError) {
    console.error('[Pollination] Error parsing response:', parseError);
    // Retourner une analyse par défaut en cas d'erreur de parsing
    return {
      score: 50,
      title: 'Repas',
      description: content.substring(0, 200),
      suggestions: ['Impossible d\'analyser le repas en détail'],
    };
  }
};
