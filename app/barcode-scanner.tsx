// ============================================================================
// BARCODE SCANNER SCREEN - Scanner OpenFoodFacts
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { 
  ArrowLeft, 
  X,
  ScanBarcode,
  AlertCircle,
  Leaf,
  Factory,
  Flame,
  Droplets,
  Cookie,
  Wheat,
  ExternalLink,
  ChevronUp,
} from 'lucide-react-native';
import { GlassCard } from '../src/components/ui';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { 
  getProductByBarcode, 
  getNutriscoreColor,
  getNovaColor,
  getNovaDescription,
  getEcoScoreColor,
  getNutrientLevelColor,
  formatNutrientLevel,
  type ProductInfo,
} from '../src/services/openfoodfacts';

// Premium colors
const PREMIUM = {
  white: '#FFFFFF',
  bg: '#0A0A0F',
  card: 'rgba(255, 255, 255, 0.05)',
  accent: '#22c55e',
  muted: 'rgba(255, 255, 255, 0.5)',
};

export default function BarcodeScannerScreen() {
  const { t } = useTranslation();
  const device = useCameraDevice('back');
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ProductInfo | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);

  // Request camera permission
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Handle barcode scan
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    if (!isScanning || isLoading || barcode === lastScannedBarcode) return;
    
    setIsScanning(false);
    setIsLoading(true);
    setLastScannedBarcode(barcode);
    
    try {
      const product = await getProductByBarcode(barcode);
      setScannedProduct(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      setScannedProduct({
        barcode,
        name: 'Erreur de recherche',
        found: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isScanning, isLoading, lastScannedBarcode]);

  // Code scanner hook
  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        handleBarcodeScanned(codes[0].value);
      }
    },
  });

  // Reset scanner
  const resetScanner = useCallback(() => {
    setScannedProduct(null);
    setShowProductDetails(false);
    setIsScanning(true);
    setLastScannedBarcode(null);
  }, []);

  // Show product details
  const openProductDetails = useCallback(() => {
    setShowProductDetails(true);
  }, []);

  // Close product details
  const closeProductDetails = useCallback(() => {
    setShowProductDetails(false);
  }, []);

  // Open OpenFoodFacts page
  const openOpenFoodFacts = useCallback(() => {
    if (scannedProduct?.barcode) {
      Linking.openURL(`https://world.openfoodfacts.org/product/${scannedProduct.barcode}`);
    }
  }, [scannedProduct]);

  // Render Nutri-Score badge
  const renderNutriScore = (grade?: string) => {
    if (!grade || grade === 'unknown') return null;
    
    return (
      <View style={[styles.scoreBadge, { backgroundColor: getNutriscoreColor(grade) }]}>
        <Text style={styles.scoreBadgeText}>Nutri-Score {grade.toUpperCase()}</Text>
      </View>
    );
  };

  // Render NOVA badge
  const renderNovaBadge = (group?: number) => {
    if (!group) return null;
    
    return (
      <View style={[styles.scoreBadge, { backgroundColor: getNovaColor(group) }]}>
        <Text style={styles.scoreBadgeText}>NOVA {group}</Text>
      </View>
    );
  };

  // Render Eco-Score badge
  const renderEcoScore = (grade?: string) => {
    if (!grade || grade === 'unknown') return null;
    
    return (
      <View style={[styles.scoreBadge, { backgroundColor: getEcoScoreColor(grade) }]}>
        <Leaf size={12} color="#fff" />
        <Text style={styles.scoreBadgeText}>Eco-Score {grade.toUpperCase()}</Text>
      </View>
    );
  };

  // No permission view
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centeredContainer}>
          <AlertCircle size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>{t('barcodeScanner.noPermission')}</Text>
          <Text style={styles.errorSubtitle}>{t('barcodeScanner.noPermissionDesc')}</Text>
          <TouchableOpacity 
            style={styles.backButtonLarge}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonLargeText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading permission
  if (hasPermission === null || !device) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.teal} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isScanning && !showProductDetails}
        codeScanner={codeScanner}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <SafeAreaView edges={['top']}>
          <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <BlurView intensity={40} tint="dark" style={styles.closeButtonBlur}>
                <ArrowLeft size={20} color={PREMIUM.white} />
              </BlurView>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('barcodeScanner.title')}</Text>
            <View style={{ width: 44 }} />
          </Animated.View>
        </SafeAreaView>

        {/* Scanner frame */}
        {isScanning && !isLoading && (
          <View style={styles.scannerFrameContainer}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scannerHint}>{t('barcodeScanner.hint')}</Text>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <BlurView intensity={60} tint="dark" style={styles.loadingBox}>
              <ActivityIndicator size="large" color={PREMIUM.accent} />
              <Text style={styles.loadingBoxText}>{t('barcodeScanner.searching')}</Text>
            </BlurView>
          </View>
        )}

        {/* Product Preview (bottom sheet) */}
        {scannedProduct && !showProductDetails && (
          <Animated.View 
            entering={SlideInDown.springify()}
            style={styles.productPreview}
          >
            <TouchableOpacity 
              style={styles.productPreviewContent}
              onPress={openProductDetails}
              activeOpacity={0.9}
            >
              <BlurView intensity={80} tint="dark" style={styles.productPreviewBlur}>
                <View style={styles.productPreviewDragHandle} />
                
                {scannedProduct.found ? (
                  <>
                    <View style={styles.productPreviewHeader}>
                      {scannedProduct.imageFrontUrl && (
                        <Image 
                          source={{ uri: scannedProduct.imageFrontUrl }} 
                          style={styles.productPreviewImage}
                        />
                      )}
                      <View style={styles.productPreviewInfo}>
                        <Text style={styles.productPreviewName} numberOfLines={2}>
                          {scannedProduct.name}
                        </Text>
                        {scannedProduct.brands && (
                          <Text style={styles.productPreviewBrand}>{scannedProduct.brands}</Text>
                        )}
                        <View style={styles.productPreviewScores}>
                          {renderNutriScore(scannedProduct.nutriscoreGrade)}
                          {renderNovaBadge(scannedProduct.novaGroup)}
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.productPreviewAction}>
                      <ChevronUp size={20} color={PREMIUM.accent} />
                      <Text style={styles.productPreviewActionText}>
                        {t('barcodeScanner.viewDetails')}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.productNotFound}>
                    <AlertCircle size={32} color={Colors.warning} />
                    <Text style={styles.productNotFoundText}>
                      {t('barcodeScanner.notFound')}
                    </Text>
                    <Text style={styles.productNotFoundBarcode}>
                      {scannedProduct.barcode}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.scanAgainButton}
                  onPress={resetScanner}
                >
                  <ScanBarcode size={18} color={PREMIUM.white} />
                  <Text style={styles.scanAgainButtonText}>{t('barcodeScanner.scanAgain')}</Text>
                </TouchableOpacity>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Full Product Details Modal */}
      {showProductDetails && scannedProduct?.found && (
        <Animated.View 
          entering={FadeInUp.springify()}
          style={styles.productDetailsModal}
        >
          <SafeAreaView style={styles.productDetailsSafe} edges={['top', 'bottom']}>
            {/* Close button */}
            <View style={styles.productDetailsHeader}>
              <TouchableOpacity 
                style={styles.productDetailsClose}
                onPress={closeProductDetails}
              >
                <X size={24} color={PREMIUM.white} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.productDetailsScroll}
              contentContainerStyle={styles.productDetailsContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Image & Name */}
              <View style={styles.productDetailsTop}>
                {scannedProduct.imageFrontUrl && (
                  <Image 
                    source={{ uri: scannedProduct.imageFrontUrl }} 
                    style={styles.productDetailsImage}
                  />
                )}
                <Text style={styles.productDetailsName}>{scannedProduct.name}</Text>
                {scannedProduct.brands && (
                  <Text style={styles.productDetailsBrand}>{scannedProduct.brands}</Text>
                )}
                {scannedProduct.quantity && (
                  <Text style={styles.productDetailsQuantity}>{scannedProduct.quantity}</Text>
                )}
              </View>

              {/* Scores Section */}
              <View style={styles.scoresSection}>
                <Text style={styles.sectionTitle}>{t('barcodeScanner.scores')}</Text>
                <View style={styles.scoresRow}>
                  {renderNutriScore(scannedProduct.nutriscoreGrade)}
                  {renderEcoScore(scannedProduct.ecoScore)}
                </View>
                {scannedProduct.novaGroup && (
                  <GlassCard style={styles.novaCard}>
                    <View style={styles.novaHeader}>
                      <Factory size={18} color={getNovaColor(scannedProduct.novaGroup)} />
                      <Text style={styles.novaTitle}>NOVA {scannedProduct.novaGroup}</Text>
                    </View>
                    <Text style={styles.novaDescription}>
                      {getNovaDescription(scannedProduct.novaGroup)}
                    </Text>
                  </GlassCard>
                )}
              </View>

              {/* Nutriments Section */}
              {scannedProduct.nutriments && (
                <View style={styles.nutrimentsSection}>
                  <Text style={styles.sectionTitle}>{t('barcodeScanner.nutrition')}</Text>
                  <GlassCard style={styles.nutrimentsCard}>
                    <Text style={styles.nutrimentsSubtitle}>
                      {t('barcodeScanner.per100g')}
                    </Text>
                    
                    {scannedProduct.nutriments.energyKcal100g !== undefined && (
                      <NutrimentRow 
                        icon={<Flame size={16} color="#f97316" />}
                        label={t('barcodeScanner.energy')}
                        value={`${Math.round(scannedProduct.nutriments.energyKcal100g)} kcal`}
                      />
                    )}
                    {scannedProduct.nutriments.fat100g !== undefined && (
                      <NutrimentRow 
                        icon={<Droplets size={16} color="#eab308" />}
                        label={t('barcodeScanner.fat')}
                        value={`${scannedProduct.nutriments.fat100g.toFixed(1)} g`}
                        level={scannedProduct.nutrientLevels?.fat}
                      />
                    )}
                    {scannedProduct.nutriments.saturatedFat100g !== undefined && (
                      <NutrimentRow 
                        label={`  ${t('barcodeScanner.saturatedFat')}`}
                        value={`${scannedProduct.nutriments.saturatedFat100g.toFixed(1)} g`}
                        level={scannedProduct.nutrientLevels?.saturatedFat}
                        indented
                      />
                    )}
                    {scannedProduct.nutriments.carbohydrates100g !== undefined && (
                      <NutrimentRow 
                        icon={<Wheat size={16} color="#a3e635" />}
                        label={t('barcodeScanner.carbs')}
                        value={`${scannedProduct.nutriments.carbohydrates100g.toFixed(1)} g`}
                      />
                    )}
                    {scannedProduct.nutriments.sugars100g !== undefined && (
                      <NutrimentRow 
                        icon={<Cookie size={16} color="#f472b6" />}
                        label={`  ${t('barcodeScanner.sugars')}`}
                        value={`${scannedProduct.nutriments.sugars100g.toFixed(1)} g`}
                        level={scannedProduct.nutrientLevels?.sugars}
                        indented
                      />
                    )}
                    {scannedProduct.nutriments.proteins100g !== undefined && (
                      <NutrimentRow 
                        label={t('barcodeScanner.proteins')}
                        value={`${scannedProduct.nutriments.proteins100g.toFixed(1)} g`}
                      />
                    )}
                    {scannedProduct.nutriments.salt100g !== undefined && (
                      <NutrimentRow 
                        label={t('barcodeScanner.salt')}
                        value={`${scannedProduct.nutriments.salt100g.toFixed(2)} g`}
                        level={scannedProduct.nutrientLevels?.salt}
                      />
                    )}
                    {scannedProduct.nutriments.fiber100g !== undefined && (
                      <NutrimentRow 
                        label={t('barcodeScanner.fiber')}
                        value={`${scannedProduct.nutriments.fiber100g.toFixed(1)} g`}
                      />
                    )}
                  </GlassCard>
                </View>
              )}

              {/* Allergens */}
              {scannedProduct.allergens && scannedProduct.allergens.length > 0 && (
                <View style={styles.allergensSection}>
                  <Text style={styles.sectionTitle}>{t('barcodeScanner.allergens')}</Text>
                  <GlassCard style={styles.allergensCard}>
                    <Text style={styles.allergensText}>
                      {scannedProduct.allergens.join(', ')}
                    </Text>
                  </GlassCard>
                </View>
              )}

              {/* OpenFoodFacts Link */}
              <TouchableOpacity 
                style={styles.openFoodFactsLink}
                onPress={openOpenFoodFacts}
              >
                <ExternalLink size={16} color={Colors.teal} />
                <Text style={styles.openFoodFactsLinkText}>
                  {t('barcodeScanner.viewOnOpenFoodFacts')}
                </Text>
              </TouchableOpacity>

              {/* Attribution */}
              <Text style={styles.attribution}>
                {t('barcodeScanner.attribution')}
              </Text>

              {/* Scan Again Button */}
              <TouchableOpacity 
                style={styles.scanAgainButtonLarge}
                onPress={resetScanner}
              >
                <ScanBarcode size={20} color={PREMIUM.white} />
                <Text style={styles.scanAgainButtonLargeText}>
                  {t('barcodeScanner.scanAnother')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

// Nutriment Row Component
function NutrimentRow({ 
  icon, 
  label, 
  value, 
  level,
  indented,
}: { 
  icon?: React.ReactNode;
  label: string;
  value: string;
  level?: string;
  indented?: boolean;
}) {
  return (
    <View style={[styles.nutrimentRow, indented && styles.nutrimentRowIndented]}>
      {icon && <View style={styles.nutrimentIcon}>{icon}</View>}
      <Text style={[styles.nutrimentLabel, !icon && { marginLeft: 0 }]}>{label}</Text>
      <Text style={styles.nutrimentValue}>{value}</Text>
      {level && (
        <View style={[styles.levelDot, { backgroundColor: getNutrientLevelColor(level) }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM.bg,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: PREMIUM.white,
  },
  
  // Scanner Frame
  scannerFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: PREMIUM.accent,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scannerHint: {
    marginTop: Spacing.lg,
    fontSize: FontSize.md,
    color: PREMIUM.white,
    textAlign: 'center',
  },

  // Loading
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    gap: Spacing.md,
    overflow: 'hidden',
  },
  loadingBoxText: {
    fontSize: FontSize.md,
    color: PREMIUM.white,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.muted,
    marginTop: Spacing.md,
  },

  // Error states
  errorTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: FontSize.md,
    color: Colors.muted,
    textAlign: 'center',
  },
  backButtonLarge: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.cta,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  backButtonLargeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  // Product Preview
  productPreview: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  productPreviewContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  productPreviewBlur: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  productPreviewDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  productPreviewHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  productPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  productPreviewInfo: {
    flex: 1,
    gap: 4,
  },
  productPreviewName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: PREMIUM.white,
  },
  productPreviewBrand: {
    fontSize: FontSize.sm,
    color: PREMIUM.muted,
  },
  productPreviewScores: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  productPreviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  productPreviewActionText: {
    fontSize: FontSize.sm,
    color: PREMIUM.accent,
    fontWeight: FontWeight.medium,
  },
  productNotFound: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  productNotFoundText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
  },
  productNotFoundBarcode: {
    fontSize: FontSize.sm,
    color: PREMIUM.muted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  scanAgainButtonText: {
    fontSize: FontSize.md,
    color: PREMIUM.white,
    fontWeight: FontWeight.medium,
  },

  // Scores
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  scoreBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  // Product Details Modal
  productDetailsModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PREMIUM.bg,
  },
  productDetailsSafe: {
    flex: 1,
  },
  productDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  productDetailsClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetailsScroll: {
    flex: 1,
  },
  productDetailsContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  productDetailsTop: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  productDetailsImage: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: Spacing.md,
  },
  productDetailsName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: PREMIUM.white,
    textAlign: 'center',
  },
  productDetailsBrand: {
    fontSize: FontSize.md,
    color: PREMIUM.muted,
    marginTop: 4,
  },
  productDetailsQuantity: {
    fontSize: FontSize.sm,
    color: PREMIUM.muted,
    marginTop: 2,
  },

  // Sections
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: PREMIUM.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  scoresSection: {
    marginBottom: Spacing.lg,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  novaCard: {
    padding: Spacing.md,
  },
  novaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  novaTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: PREMIUM.white,
  },
  novaDescription: {
    fontSize: FontSize.sm,
    color: PREMIUM.muted,
  },

  // Nutriments
  nutrimentsSection: {
    marginBottom: Spacing.lg,
  },
  nutrimentsCard: {
    padding: Spacing.md,
  },
  nutrimentsSubtitle: {
    fontSize: FontSize.xs,
    color: PREMIUM.muted,
    marginBottom: Spacing.sm,
  },
  nutrimentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  nutrimentRowIndented: {
    paddingLeft: Spacing.md,
  },
  nutrimentIcon: {
    width: 24,
    marginRight: Spacing.sm,
  },
  nutrimentLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: PREMIUM.white,
    marginLeft: Spacing.sm,
  },
  nutrimentValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: PREMIUM.white,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },

  // Allergens
  allergensSection: {
    marginBottom: Spacing.lg,
  },
  allergensCard: {
    padding: Spacing.md,
  },
  allergensText: {
    fontSize: FontSize.sm,
    color: Colors.warning,
    textTransform: 'capitalize',
  },

  // OpenFoodFacts Link
  openFoodFactsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  openFoodFactsLinkText: {
    fontSize: FontSize.sm,
    color: Colors.teal,
    fontWeight: FontWeight.medium,
  },

  // Attribution
  attribution: {
    fontSize: FontSize.xs,
    color: PREMIUM.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },

  // Scan Again Button Large
  scanAgainButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: PREMIUM.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  scanAgainButtonLargeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: PREMIUM.white,
  },
});
