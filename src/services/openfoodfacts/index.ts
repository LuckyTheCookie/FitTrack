// ============================================================================
// OPENFOODFACTS API SERVICE - Récupération des infos produits via code-barres
// ============================================================================

const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product';

// ============================================================================
// TYPES
// ============================================================================

export interface NutrientLevels {
  fat?: 'low' | 'moderate' | 'high';
  saturatedFat?: 'low' | 'moderate' | 'high';
  sugars?: 'low' | 'moderate' | 'high';
  salt?: 'low' | 'moderate' | 'high';
}

export interface Nutriments {
  energyKcal100g?: number;
  proteins100g?: number;
  carbohydrates100g?: number;
  fat100g?: number;
  fiber100g?: number;
  sugars100g?: number;
  salt100g?: number;
  saturatedFat100g?: number;
}

export interface ProductInfo {
  barcode: string;
  name: string;
  brands?: string;
  quantity?: string;
  imageUrl?: string;
  imageFrontUrl?: string;
  nutriscoreGrade?: 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown';
  nutriscoreScore?: number;
  novaGroup?: 1 | 2 | 3 | 4;
  ecoScore?: 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown';
  categories?: string;
  ingredients?: string;
  allergens?: string[];
  nutriments?: Nutriments;
  nutrientLevels?: NutrientLevels;
  servingSize?: string;
  found: boolean;
}

interface OpenFoodFactsApiResponse {
  status: number;
  status_verbose: string;
  product?: {
    code: string;
    product_name?: string;
    product_name_fr?: string;
    brands?: string;
    quantity?: string;
    image_url?: string;
    image_front_url?: string;
    image_front_small_url?: string;
    nutriscore_grade?: string;
    nutriscore_score?: number;
    nova_group?: number;
    ecoscore_grade?: string;
    categories?: string;
    ingredients_text?: string;
    ingredients_text_fr?: string;
    allergens_tags?: string[];
    nutriments?: {
      'energy-kcal_100g'?: number;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      fat_100g?: number;
      fiber_100g?: number;
      sugars_100g?: number;
      salt_100g?: number;
      'saturated-fat_100g'?: number;
    };
    nutrient_levels?: {
      fat?: string;
      'saturated-fat'?: string;
      sugars?: string;
      salt?: string;
    };
    serving_size?: string;
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Recherche un produit par son code-barres
 * @param barcode Code-barres du produit (EAN-13, UPC, etc.)
 * @returns Informations du produit ou null si non trouvé
 */
export async function getProductByBarcode(barcode: string): Promise<ProductInfo> {
  try {
    console.log('[OpenFoodFacts] Searching for barcode:', barcode);
    
    const response = await fetch(
      `${OPENFOODFACTS_API_URL}/${barcode}.json?fields=code,product_name,product_name_fr,brands,quantity,image_url,image_front_url,image_front_small_url,nutriscore_grade,nutriscore_score,nova_group,ecoscore_grade,categories,ingredients_text,ingredients_text_fr,allergens_tags,nutriments,nutrient_levels,serving_size`,
      {
        headers: {
          'User-Agent': 'Spix-FitnessApp/1.0 (contact@spix.app)',
        },
      }
    );

    if (!response.ok) {
      console.error('[OpenFoodFacts] API error:', response.status);
      return createNotFoundProduct(barcode);
    }

    const data: OpenFoodFactsApiResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      console.log('[OpenFoodFacts] Product not found');
      return createNotFoundProduct(barcode);
    }

    const product = data.product;

    // Parse nutrient levels
    const nutrientLevels: NutrientLevels = {};
    if (product.nutrient_levels) {
      nutrientLevels.fat = parseNutrientLevel(product.nutrient_levels.fat);
      nutrientLevels.saturatedFat = parseNutrientLevel(product.nutrient_levels['saturated-fat']);
      nutrientLevels.sugars = parseNutrientLevel(product.nutrient_levels.sugars);
      nutrientLevels.salt = parseNutrientLevel(product.nutrient_levels.salt);
    }

    // Parse nutriments
    const nutriments: Nutriments = {};
    if (product.nutriments) {
      nutriments.energyKcal100g = product.nutriments['energy-kcal_100g'];
      nutriments.proteins100g = product.nutriments.proteins_100g;
      nutriments.carbohydrates100g = product.nutriments.carbohydrates_100g;
      nutriments.fat100g = product.nutriments.fat_100g;
      nutriments.fiber100g = product.nutriments.fiber_100g;
      nutriments.sugars100g = product.nutriments.sugars_100g;
      nutriments.salt100g = product.nutriments.salt_100g;
      nutriments.saturatedFat100g = product.nutriments['saturated-fat_100g'];
    }

    const productInfo: ProductInfo = {
      barcode,
      name: product.product_name_fr || product.product_name || 'Produit inconnu',
      brands: product.brands,
      quantity: product.quantity,
      imageUrl: product.image_url,
      imageFrontUrl: product.image_front_url || product.image_front_small_url,
      nutriscoreGrade: parseNutriscore(product.nutriscore_grade),
      nutriscoreScore: product.nutriscore_score,
      novaGroup: parseNovaGroup(product.nova_group),
      ecoScore: parseEcoScore(product.ecoscore_grade),
      categories: product.categories,
      ingredients: product.ingredients_text_fr || product.ingredients_text,
      allergens: product.allergens_tags?.map(a => a.replace('en:', '').replace('fr:', '')),
      nutriments,
      nutrientLevels,
      servingSize: product.serving_size,
      found: true,
    };

    console.log('[OpenFoodFacts] Product found:', productInfo.name);
    return productInfo;
  } catch (error) {
    console.error('[OpenFoodFacts] Error fetching product:', error);
    return createNotFoundProduct(barcode);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function createNotFoundProduct(barcode: string): ProductInfo {
  return {
    barcode,
    name: 'Produit non trouvé',
    found: false,
  };
}

function parseNutrientLevel(level?: string): 'low' | 'moderate' | 'high' | undefined {
  if (level === 'low' || level === 'moderate' || level === 'high') {
    return level;
  }
  return undefined;
}

function parseNutriscore(grade?: string): 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown' {
  if (grade && ['a', 'b', 'c', 'd', 'e'].includes(grade.toLowerCase())) {
    return grade.toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'e';
  }
  return 'unknown';
}

function parseNovaGroup(group?: number): 1 | 2 | 3 | 4 | undefined {
  if (group && group >= 1 && group <= 4) {
    return group as 1 | 2 | 3 | 4;
  }
  return undefined;
}

function parseEcoScore(grade?: string): 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown' {
  if (grade && ['a', 'b', 'c', 'd', 'e'].includes(grade.toLowerCase())) {
    return grade.toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'e';
  }
  return 'unknown';
}

/**
 * Get color for Nutri-Score grade
 */
export function getNutriscoreColor(grade: string): string {
  switch (grade.toLowerCase()) {
    case 'a': return '#038141';
    case 'b': return '#85BB2F';
    case 'c': return '#FECB02';
    case 'd': return '#EE8100';
    case 'e': return '#E63E11';
    default: return '#808080';
  }
}

/**
 * Get description for NOVA group
 */
export function getNovaDescription(group?: number): string {
  switch (group) {
    case 1: return 'Aliments non transformés';
    case 2: return 'Ingrédients culinaires';
    case 3: return 'Aliments transformés';
    case 4: return 'Produits ultra-transformés';
    default: return 'Non classé';
  }
}

/**
 * Get color for NOVA group
 */
export function getNovaColor(group?: number): string {
  switch (group) {
    case 1: return '#038141';
    case 2: return '#85BB2F';
    case 3: return '#FECB02';
    case 4: return '#E63E11';
    default: return '#808080';
  }
}

/**
 * Get color for Eco-Score grade
 */
export function getEcoScoreColor(grade: string): string {
  switch (grade.toLowerCase()) {
    case 'a': return '#038141';
    case 'b': return '#85BB2F';
    case 'c': return '#FECB02';
    case 'd': return '#EE8100';
    case 'e': return '#E63E11';
    default: return '#808080';
  }
}

/**
 * Get color for nutrient level
 */
export function getNutrientLevelColor(level?: string): string {
  switch (level) {
    case 'low': return '#038141';
    case 'moderate': return '#FECB02';
    case 'high': return '#E63E11';
    default: return '#808080';
  }
}

/**
 * Format nutrient level for display
 */
export function formatNutrientLevel(level?: string): string {
  switch (level) {
    case 'low': return 'Faible';
    case 'moderate': return 'Modéré';
    case 'high': return 'Élevé';
    default: return '-';
  }
}
