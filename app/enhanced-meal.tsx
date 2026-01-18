// ============================================================================
// ENHANCED MEAL PAGE - Page d'ajout de repas avec analyse IA
// Design premium avec glassmorphism et animations fluides
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { 
    FadeIn, 
    FadeInDown, 
    FadeInUp,
    SlideInRight,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { 
    ArrowLeft, 
    Camera, 
    Image as ImageIcon, 
    Sparkles, 
    Check,
    X,
    ChefHat,
    Lightbulb,
    Save,
    AlertTriangle,
    Star,
    Utensils,
} from 'lucide-react-native';
import { GlassCard, CustomAlertModal } from '../src/components/ui';
import type { AlertButton } from '../src/components/ui';
import { useAppStore } from '../src/stores';
import { 
    isPollinationConnected, 
    analyzeMealImage,
    type MealAnalysis,
} from '../src/services/pollination';
import { uploadImageToTmpFiles } from '../src/services/imageUpload';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../src/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Score color based on value
const getScoreColor = (score: number): string => {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#84cc16';
    if (score >= 50) return '#eab308';
    if (score >= 30) return '#f97316';
    return '#ef4444';
};

// Score gradient based on value
const getScoreGradient = (score: number): [string, string] => {
    if (score >= 85) return ['#22c55e', '#16a34a'];
    if (score >= 70) return ['#84cc16', '#65a30d'];
    if (score >= 50) return ['#eab308', '#ca8a04'];
    if (score >= 30) return ['#f97316', '#ea580c'];
    return ['#ef4444', '#dc2626'];
};

// Score label based on value
const getScoreLabel = (score: number): string => {
    if (score >= 85) return 'Excellent !';
    if (score >= 70) return 'Très bien';
    if (score >= 50) return 'Pas mal';
    if (score >= 30) return 'À améliorer';
    return 'Attention';
};

type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealTimeOption {
    value: MealTime;
    label: string;
    emoji: string;
    gradient: [string, string];
}

const mealTimeOptions: MealTimeOption[] = [
    { value: 'breakfast', label: 'Petit-déj', emoji: '☀️', gradient: ['#fbbf24', '#f59e0b'] },
    { value: 'lunch', label: 'Déjeuner', emoji: '🌤️', gradient: ['#60a5fa', '#3b82f6'] },
    { value: 'dinner', label: 'Dîner', emoji: '🌙', gradient: ['#8b5cf6', '#7c3aed'] },
    { value: 'snack', label: 'Collation', emoji: '🍎', gradient: ['#f472b6', '#ec4899'] },
];

// Alert state interface
interface AlertState {
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    buttons: AlertButton[];
}

export default function EnhancedMealScreen() {
    const { t } = useTranslation();
    const { addMeal } = useAppStore();
    
    // State
    const [selectedTime, setSelectedTime] = useState<MealTime>('lunch');
    const [description, setDescription] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
    const [isPlopEnabled, setIsPlopEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Custom Alert State
    const [alertState, setAlertState] = useState<AlertState>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });
    
    // Animation values
    const scoreScale = useSharedValue(0);
    
    const scoreAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scoreScale.value }],
    }));

    // Phrases drôles pour l'analyse
    const funnyPhrases = [
        "Patience, Ploppy se réveille...",
        "Ploppy analyse ton assiette...",
        "Ploppy compte les calories...",
        "Ploppy réfléchit très fort...",
        "Ploppy consulte son encyclopédie...",
        "Mmh, ça a l'air bon !",
        "Ploppy prend des notes...",
        "Un instant, Ploppy goûte virtuellement...",
        "Ploppy vérifie la recette...",
        "Ploppy fait ses calculs..."
    ];
    const [currentPhrase, setCurrentPhrase] = React.useState(funnyPhrases[0]);

    // Helper to show alert
    const showAlert = useCallback((
        title: string, 
        message: string, 
        type: AlertState['type'] = 'info',
        buttons: AlertButton[] = [{ text: 'OK', style: 'default' }]
    ) => {
        setAlertState({ visible: true, title, message, type, buttons });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertState(prev => ({ ...prev, visible: false }));
    }, []);

    // Check if Pollination is connected
    const checkPollinationConnection = useCallback(async () => {
        const connected = await isPollinationConnected();
        setIsPlopEnabled(connected);
        return connected;
    }, []);

    // Initial check
    React.useEffect(() => {
        checkPollinationConnection();
    }, [checkPollinationConnection]);

    // Change funny phrase periodically during upload/analysis
    React.useEffect(() => {
        if (isUploading || isAnalyzing) {
            const interval = setInterval(() => {
                setCurrentPhrase(funnyPhrases[Math.floor(Math.random() * funnyPhrases.length)]);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isUploading, isAnalyzing]);

    // Pick image from camera
    const pickFromCamera = useCallback(async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            showAlert(
                t('enhancedMeal.permissionRequired'),
                t('enhancedMeal.cameraPermissionMessage'),
                'warning'
            );
            return;
        }
        
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        
        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            setAnalysis(null);
        }
    }, [t, showAlert]);

    // Pick image from gallery
    const pickFromGallery = useCallback(async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            showAlert(
                t('enhancedMeal.permissionRequired'),
                t('enhancedMeal.galleryPermissionMessage'),
                'warning'
            );
            return;
        }
        
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        
        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            setAnalysis(null);
        }
    }, [t, showAlert]);

    // Analyze image with Ploppy
    const analyzeWithPloppy = useCallback(async () => {
        if (!selectedImage) {
            showAlert(t('enhancedMeal.noImage'), t('enhancedMeal.selectImageFirst'), 'warning');
            return;
        }
        
        const connected = await checkPollinationConnection();
        if (!connected) {
            showAlert(
                t('enhancedMeal.notConnected'),
                t('enhancedMeal.connectPollinationFirst'),
                'warning',
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { 
                        text: t('settings.labs'), 
                        onPress: () => router.push('/settings/labs'),
                        style: 'default'
                    },
                ]
            );
            return;
        }
        
        try {
            setIsUploading(true);
            
            const uploadResult = await uploadImageToTmpFiles(selectedImage);
            
            if (!uploadResult.success || !uploadResult.url) {
                throw new Error(uploadResult.error || 'Upload failed');
            }
            
            setIsUploading(false);
            setIsAnalyzing(true);
            
            const result = await analyzeMealImage(uploadResult.url);
            
            setAnalysis(result);
            setDescription(result.description);
            
            // Simple scale animation without bounce
            scoreScale.value = withSequence(
                withTiming(0, { duration: 0 }),
                withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
            );
            
        } catch (error) {
            console.error('[EnhancedMeal] Analysis error:', error);
            showAlert(
                t('enhancedMeal.analysisError'),
                t('enhancedMeal.analysisErrorMessage'),
                'error'
            );
        } finally {
            setIsUploading(false);
            setIsAnalyzing(false);
        }
    }, [selectedImage, t, checkPollinationConnection, scoreScale, showAlert]);

    // Save meal
    const saveMeal = useCallback(async () => {
        const mealNames: Record<MealTime, string> = {
            breakfast: '☀️ Petit-déj',
            lunch: '🌤️ Déjeuner',
            dinner: '🌙 Dîner',
            snack: '🍎 Collation',
        };
        
        const mealTitle = analysis?.title 
            ? `${mealNames[selectedTime]} - ${analysis.title}`
            : mealNames[selectedTime];
        
        const mealDescription = description || analysis?.description || '';
        
        if (!mealDescription.trim()) {
            showAlert(
                t('enhancedMeal.noDescription'),
                t('enhancedMeal.addDescriptionFirst'),
                'warning'
            );
            return;
        }
        
        setIsSaving(true);
        
        try {
            addMeal({
                mealName: mealTitle,
                description: mealDescription,
                score: analysis?.score,
                suggestions: analysis?.suggestions,
            });
            
            showAlert(
                t('enhancedMeal.saved'),
                t('enhancedMeal.savedMessage'),
                'success',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            showAlert(t('common.error'), t('enhancedMeal.saveError'), 'error');
        } finally {
            setIsSaving(false);
        }
    }, [selectedTime, description, analysis, addMeal, t, showAlert]);

    // Clear image
    const clearImage = useCallback(() => {
        setSelectedImage(null);
        setAnalysis(null);
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />
            
            {/* Background gradient */}
            <LinearGradient
                colors={['rgba(139, 92, 246, 0.08)', 'transparent', 'rgba(45, 212, 191, 0.05)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <Animated.View entering={FadeIn} style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft size={22} color={Colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{t('enhancedMeal.title')}</Text>
                        <Text style={styles.headerSubtitle}>Analyse IA avec Ploppy 🐦</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <LinearGradient
                            colors={['rgba(215, 150, 134, 0.2)', 'rgba(215, 150, 134, 0.05)']}
                            style={styles.headerIconGradient}
                        >
                            <ChefHat size={22} color={Colors.cta} />
                        </LinearGradient>
                    </View>
                </Animated.View>

                {/* Meal Time Selection - Grid 2x2 */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={styles.sectionLabel}>{t('enhancedMeal.mealTime')}</Text>
                    <View style={styles.timeOptionsGrid}>
                        {mealTimeOptions.map((option, index) => (
                            <Animated.View
                                key={option.value}
                                entering={FadeInDown.delay(150 + index * 50).springify()}
                                style={styles.timeOptionContainer}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.timeOption,
                                        selectedTime === option.value && styles.timeOptionSelected,
                                    ]}
                                    onPress={() => setSelectedTime(option.value)}
                                    activeOpacity={0.8}
                                >
                                    {selectedTime === option.value ? (
                                        <LinearGradient
                                            colors={option.gradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.timeOptionGradient}
                                        >
                                            <Text style={styles.timeEmoji}>{option.emoji}</Text>
                                            <Text style={styles.timeLabelSelected}>{option.label}</Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={styles.timeOptionInner}>
                                            <Text style={styles.timeEmoji}>{option.emoji}</Text>
                                            <Text style={styles.timeLabel}>{option.label}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </Animated.View>

                {/* Image Section */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Text style={styles.sectionLabel}>{t('enhancedMeal.photo')}</Text>
                    
                    {selectedImage ? (
                        <View style={styles.imageContainer}>
                            <Image 
                                source={{ uri: selectedImage }} 
                                style={styles.imagePreview} 
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.6)']}
                                style={styles.imageOverlay}
                            />
                            <TouchableOpacity 
                                style={styles.clearImageButton}
                                onPress={clearImage}
                            >
                                <BlurView intensity={30} tint="dark" style={styles.clearImageBlur}>
                                    <X size={18} color="#fff" />
                                </BlurView>
                            </TouchableOpacity>
                            
                            <View style={styles.imageInfoBadge}>
                                <Utensils size={14} color="#fff" />
                                <Text style={styles.imageInfoText}>Photo prête</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.imageButtonsContainer}>
                            <TouchableOpacity
                                style={styles.imageButton}
                                onPress={pickFromCamera}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['rgba(45, 212, 191, 0.15)', 'rgba(45, 212, 191, 0.05)']}
                                    style={styles.imageButtonGradient}
                                >
                                    <View style={styles.imageButtonIconWrap}>
                                        <Camera size={28} color={Colors.teal} />
                                    </View>
                                    <Text style={styles.imageButtonTitle}>{t('enhancedMeal.camera')}</Text>
                                    <Text style={styles.imageButtonSubtitle}>Prendre une photo</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.imageButton}
                                onPress={pickFromGallery}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['rgba(215, 150, 134, 0.15)', 'rgba(215, 150, 134, 0.05)']}
                                    style={styles.imageButtonGradient}
                                >
                                    <View style={styles.imageButtonIconWrap}>
                                        <ImageIcon size={28} color={Colors.cta} />
                                    </View>
                                    <Text style={styles.imageButtonTitle}>{t('enhancedMeal.gallery')}</Text>
                                    <Text style={styles.imageButtonSubtitle}>Choisir une image</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>

                {/* Ploppy Analysis Button */}
                {selectedImage && !analysis && (
                    <Animated.View entering={FadeInDown.delay(300).springify()}>
                        <TouchableOpacity
                            style={styles.plopButtonMascot}
                            onPress={analyzeWithPloppy}
                            disabled={isAnalyzing || isUploading}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#a78bfa', '#8b5cf6', '#7c3aed']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.plopButtonGradient}
                            >
                                {isUploading || isAnalyzing ? (
                                    <View style={styles.plopButtonContent}>
                                        <View style={styles.plopButtonEmojiCircle}>
                                            <Text style={styles.plopButtonEmoji}>🐦</Text>
                                        </View>
                                        <View style={styles.plopButtonTexts}>
                                            <Text style={styles.plopButtonTitle}>
                                                {currentPhrase}
                                            </Text>
                                        </View>
                                        <ActivityIndicator size="small" color="#fff" style={styles.plopButtonSpinner} />
                                    </View>
                                ) : (
                                    <View style={styles.plopButtonContent}>
                                        <View style={styles.plopButtonEmojiCircle}>
                                            <Text style={styles.plopButtonEmoji}>🐦</Text>
                                        </View>
                                        <View style={styles.plopButtonTexts}>
                                            <Text style={styles.plopButtonTitle}>Demander à Ploppy</Text>
                                            <Text style={styles.plopButtonSubtitle}>Analyse ton repas</Text>
                                        </View>
                                        <Sparkles size={20} color="#fff" style={styles.plopButtonIcon} />
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                        
                        <View style={styles.betaWarning}>
                            <AlertTriangle size={14} color={Colors.muted} />
                            <Text style={styles.betaWarningText}>
                                {t('enhancedMeal.betaWarning')}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Analysis Results */}
                {analysis && (
                    <Animated.View entering={FadeInUp.delay(100).springify()}>
                        {/* Score Card */}
                        <View style={styles.scoreCardContainer}>
                            <LinearGradient
                                colors={['rgba(31, 41, 55, 0.95)', 'rgba(17, 24, 39, 0.98)']}
                                style={styles.scoreCard}
                            >
                                <View style={[styles.decorativeCircle, styles.decorativeCircle1]} />
                                <View style={[styles.decorativeCircle, styles.decorativeCircle2]} />
                                
                                <View style={styles.scoreHeader}>
                                    <View style={styles.scoreTitleContainer}>
                                        <Star size={16} color="#fbbf24" fill="#fbbf24" />
                                        <Text style={styles.scoreTitle}>{analysis.title}</Text>
                                    </View>
                                </View>
                                
                                <Animated.View style={[styles.scoreCircleContainer, scoreAnimatedStyle]}>
                                    <LinearGradient
                                        colors={getScoreGradient(analysis.score)}
                                        style={styles.scoreCircle}
                                    >
                                        <Text style={styles.scoreValue}>{analysis.score}</Text>
                                        <Text style={styles.scoreMax}>/100</Text>
                                    </LinearGradient>
                                    <Text style={[styles.scoreLabel, { color: getScoreColor(analysis.score) }]}>
                                        {getScoreLabel(analysis.score)}
                                    </Text>
                                </Animated.View>
                                
                                <Text style={styles.scoreDescription}>{analysis.description}</Text>
                            </LinearGradient>
                        </View>

                        {/* Suggestions Card */}
                        {analysis.suggestions.length > 0 && (
                            <Animated.View entering={SlideInRight.delay(200).springify()}>
                                <GlassCard style={styles.suggestionsCard}>
                                    <View style={styles.suggestionsHeader}>
                                        <View style={styles.suggestionsIconWrap}>
                                            <Lightbulb size={18} color="#fbbf24" />
                                        </View>
                                        <Text style={styles.suggestionsTitle}>
                                            {t('enhancedMeal.suggestions')}
                                        </Text>
                                    </View>
                                    
                                    {analysis.suggestions.map((suggestion, index) => (
                                        <Animated.View 
                                            key={index} 
                                            entering={FadeInDown.delay(300 + index * 100).springify()}
                                            style={styles.suggestionItem}
                                        >
                                            <View style={styles.suggestionBullet}>
                                                <Check size={12} color="#fff" />
                                            </View>
                                            <Text style={styles.suggestionText}>{suggestion}</Text>
                                        </Animated.View>
                                    ))}
                                </GlassCard>
                            </Animated.View>
                        )}
                    </Animated.View>
                )}

                {/* Manual Description */}
                <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <Text style={styles.sectionLabel}>{t('enhancedMeal.description')}</Text>
                    <View style={styles.descriptionContainer}>
                        <TextInput
                            style={styles.descriptionInput}
                            value={description}
                            onChangeText={setDescription}
                            placeholder={t('enhancedMeal.descriptionPlaceholder')}
                            placeholderTextColor={Colors.muted}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </Animated.View>

                {/* Save Button */}
                <Animated.View entering={FadeInDown.delay(500).springify()}>
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                        onPress={saveMeal}
                        disabled={isSaving}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={Gradients.cta as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButtonGradient}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Save size={20} color="#fff" />
                                    <Text style={styles.saveButtonText}>
                                        {t('enhancedMeal.save')}
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>
            
            {/* Custom Alert Modal */}
            <CustomAlertModal
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                buttons={alertState.buttons}
                onClose={hideAlert}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        gap: Spacing.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    headerRight: {
        width: 44,
        height: 44,
    },
    headerIconGradient: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Section Label
    sectionLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        color: Colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: Spacing.md,
        marginLeft: 2,
    },

    // Time Selection - Grid 2x2
    timeOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    timeOptionContainer: {
        width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    },
    timeOption: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    timeOptionSelected: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    timeOptionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    timeOptionInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.xl,
        gap: Spacing.sm,
    },
    timeEmoji: {
        fontSize: 20,
    },
    timeLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.muted,
    },
    timeLabelSelected: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },

    // Image Section
    imageContainer: {
        position: 'relative',
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
    },
    imagePreview: {
        width: '100%',
        height: 220,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    clearImageButton: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
    },
    clearImageBlur: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    imageInfoBadge: {
        position: 'absolute',
        bottom: Spacing.md,
        left: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.lg,
    },
    imageInfoText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
        color: '#fff',
    },
    imageButtonsContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    imageButton: {
        flex: 1,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    imageButtonGradient: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: BorderRadius.xl,
        borderStyle: 'dashed',
    },
    imageButtonIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    imageButtonTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    imageButtonSubtitle: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },

    // Ploppy Button - Redesigned
    plopButtonMascot: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    plopButtonGradient: {
        paddingVertical: Spacing.lg + 4,
        paddingHorizontal: Spacing.xl,
    },
    plopButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    plopButtonEmojiCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    plopButtonEmoji: {
        fontSize: 28,
    },
    plopButtonTexts: {
        flex: 1,
    },
    plopButtonTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
    plopButtonSubtitle: {
        fontSize: FontSize.sm,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 2,
    },
    plopButtonSpinner: {
        marginLeft: Spacing.xs,
    },
    plopButtonIcon: {
        marginLeft: Spacing.xs,
    },

    // Beta Warning
    betaWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    betaWarningText: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },

    // Score Card
    scoreCardContainer: {
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    scoreCard: {
        padding: Spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: BorderRadius.xl,
        position: 'relative',
        overflow: 'hidden',
    },
    decorativeCircle: {
        position: 'absolute',
        borderRadius: 100,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    decorativeCircle1: {
        width: 150,
        height: 150,
        top: -50,
        right: -50,
    },
    decorativeCircle2: {
        width: 100,
        height: 100,
        bottom: -30,
        left: -30,
        backgroundColor: 'rgba(45, 212, 191, 0.08)',
    },
    scoreHeader: {
        marginBottom: Spacing.lg,
    },
    scoreTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    scoreTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    scoreCircleContainer: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    scoreCircle: {
        width: 130,
        height: 130,
        borderRadius: 65,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: FontWeight.extrabold,
        color: '#fff',
    },
    scoreMax: {
        fontSize: FontSize.md,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: -6,
    },
    scoreLabel: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    scoreDescription: {
        fontSize: FontSize.md,
        color: Colors.text,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: Spacing.sm,
    },

    // Suggestions Card
    suggestionsCard: {
        marginBottom: Spacing.lg,
    },
    suggestionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    suggestionsIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    suggestionsTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    suggestionBullet: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.teal,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    suggestionText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.text,
        lineHeight: 22,
    },

    // Description
    descriptionContainer: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: Spacing.lg,
        overflow: 'hidden',
    },
    descriptionInput: {
        padding: Spacing.lg,
        fontSize: FontSize.md,
        color: Colors.text,
        minHeight: 120,
    },

    // Save Button
    saveButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        shadowColor: Colors.cta,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0,
    },
    saveButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
    },
    saveButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
});
