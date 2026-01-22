// ============================================================================
// ENHANCED MEAL PAGE - Page d'ajout de repas avec analyse IA
// Design premium avec contraste noir/blanc et animations fluides
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
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
    Pressable,
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
    ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { 
    ArrowLeft, 
    Camera, 
    Image as ImageIcon, 
    Sparkles, 
    Check,
    X,
    Lightbulb,
    Save,
    AlertTriangle,
    Star,
    Info,
    ChevronRight,
    Zap,
    Settings,
} from 'lucide-react-native';
import { CustomAlertModal, PloppyOnboardingModal } from '../src/components/ui';
import type { AlertButton } from '../src/components/ui';
import { PloppySettingsSheet } from '../src/components/sheets';
import type { PloppySettingsSheetRef } from '../src/components/sheets';
import { useAppStore } from '../src/stores';
import { 
    isPollinationConnected, 
    analyzeMealImage,
    type MealAnalysis,
} from '../src/services/pollination';
import { uploadImageToTmpFiles } from '../src/services/imageUpload';
import { getTodayDateString, formatDisplayDate } from '../src/utils/date';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium Design Colors
const PREMIUM = {
    black: '#000000',
    white: '#FFFFFF',
    offWhite: '#F8F8F8',
    gray100: '#E5E5E5',
    gray200: '#CCCCCC',
    gray400: '#888888',
    gray600: '#555555',
    gray800: '#222222',
    gray900: '#111111',
    accent: '#CEFF00', // Vert acide pour accents
    teal: '#2DD4BF',
    purple: '#A78BFA',
};

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
    if (score >= 50) return 'Correct';
    if (score >= 30) return 'À améliorer';
    return 'Attention';
};

// Get meal time based on hour
const getMealTimeFromHour = (hour: number): MealTime => {
    if (hour >= 6 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 22) return 'dinner';
    return 'snack';
};

type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealTimeOption {
    value: MealTime;
    label: string;
    emoji: string;
    time: string;
}

const mealTimeOptions: MealTimeOption[] = [
    { value: 'breakfast', label: 'Petit-déj', emoji: '☀️', time: '6h-10h' },
    { value: 'lunch', label: 'Déjeuner', emoji: '🌤️', time: '11h-14h' },
    { value: 'dinner', label: 'Dîner', emoji: '🌙', time: '18h-21h' },
    { value: 'snack', label: 'Collation', emoji: '🍎', time: 'Entre-deux' },
];

// Alert state interface
interface AlertState {
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    buttons: AlertButton[];
}

// Time Card Component for 2x2 Grid
const TimeCard = ({ 
    selected, 
    onPress, 
    emoji, 
    label, 
    time 
}: { 
    selected: boolean; 
    onPress: () => void; 
    emoji: string; 
    label: string;
    time: string;
}) => {
    const scale = useSharedValue(1);
    
    const handlePressIn = () => {
        scale.value = withSpring(0.95);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };
    
    const handlePressOut = () => {
        scale.value = withSpring(1);
        onPress();
    };
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));
    
    return (
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={{ flex: 1 }}>
            <Animated.View style={[
                styles.timeCard,
                selected && styles.timeCardSelected,
                animatedStyle,
            ]}>
                <Text style={styles.timeCardEmoji}>{emoji}</Text>
                <Text style={[styles.timeCardLabel, selected && styles.timeCardLabelSelected]}>
                    {label}
                </Text>
                <Text style={[styles.timeCardTime, selected && styles.timeCardTimeSelected]}>
                    {time}
                </Text>
                {selected && (
                    <View style={styles.timeCardCheck}>
                        <Check size={12} color={PREMIUM.black} strokeWidth={3} />
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
};

export default function EnhancedMealScreen() {
    const { t } = useTranslation();
    const { addMeal, settings } = useAppStore();
    
    // Refs
    const settingsSheetRef = useRef<PloppySettingsSheetRef>(null);
    
    // Ploppy settings
    const ploppyEnabled = settings.ploppyEnabled ?? false;
    const ploppyOnboardingShown = settings.ploppyOnboardingShown ?? false;
    
    // State
    const [showOnboarding, setShowOnboarding] = useState(!ploppyOnboardingShown);
    const [selectedTime, setSelectedTime] = useState<MealTime>(() => {
        const hour = new Date().getHours();
        return getMealTimeFromHour(hour);
    });
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [description, setDescription] = useState('');
    const [additionalDetails, setAdditionalDetails] = useState('');
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
        opacity: scoreScale.value,
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
            let index = 0;
            const interval = setInterval(() => {
                index = (index + 1) % funnyPhrases.length;
                setCurrentPhrase(funnyPhrases[index]);
            }, 1500);
            return () => clearInterval(interval);
        }
    }, [isUploading, isAnalyzing]);

    // Pick image from camera
    const pickFromCamera = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            setIsUploading(true);
            
            const uploadResult = await uploadImageToTmpFiles(selectedImage);
            
            if (!uploadResult.success || !uploadResult.url) {
                throw new Error(uploadResult.error || 'Upload failed');
            }
            
            setIsUploading(false);
            setIsAnalyzing(true);
            
            // Passer les détails additionnels à l'IA
            const result = await analyzeMealImage(uploadResult.url, additionalDetails);
            
            setAnalysis(result);
            setDescription(result.description);
            
            // Animation d'entrée du score - simple fade
            scoreScale.value = withTiming(1, { duration: 300 });
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
        } catch (error) {
            console.error('[EnhancedMeal] Analysis error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showAlert(
                t('enhancedMeal.analysisError'),
                t('enhancedMeal.analysisErrorMessage'),
                'error'
            );
        } finally {
            setIsUploading(false);
            setIsAnalyzing(false);
        }
    }, [selectedImage, additionalDetails, t, checkPollinationConnection, scoreScale, showAlert]);

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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            // Format date to YYYY-MM-DD for customDate
            const customDateString = format(selectedDate, 'yyyy-MM-dd');
            
            addMeal({
                mealName: mealTitle,
                description: mealDescription,
                score: analysis?.score,
                suggestions: analysis?.suggestions,
            }, customDateString);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    }, [selectedTime, selectedDate, description, analysis, addMeal, t, showAlert]);

    // Clear image
    const clearImage = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedImage(null);
        setAnalysis(null);
    }, []);

    // Handle date change
    const onDateChange = useCallback((event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
        }
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header Premium */}
                    <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.back();
                            }}
                        >
                            <ArrowLeft size={20} color={PREMIUM.white} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>Nouveau repas</Text>
                            {ploppyEnabled && (
                                <View style={styles.headerBadge}>
                                    <Sparkles size={10} color={PREMIUM.accent} />
                                    <Text style={styles.headerBadgeText}>IA</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                settingsSheetRef.current?.present();
                            }}
                        >
                            <Settings size={20} color={PREMIUM.white} strokeWidth={2} />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Meal Time Selection - 2x2 Grid */}
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Moment du repas</Text>
                            <TouchableOpacity 
                                style={styles.dateButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowDatePicker(true);
                                }}
                            >
                                <Text style={styles.dateButtonText}>
                                    {format(selectedDate, 'd MMM yyyy')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.timeGrid}>
                            {mealTimeOptions.map((option, index) => (
                                <Animated.View 
                                    key={option.value}
                                    entering={FadeInDown.delay(150 + index * 50).springify()}
                                    style={{ flex: 1, marginBottom: index < 2 ? 12 : 0 }}
                                >
                                    <TimeCard
                                        selected={selectedTime === option.value}
                                        onPress={() => setSelectedTime(option.value)}
                                        emoji={option.emoji}
                                        label={option.label}
                                        time={option.time}
                                    />
                                </Animated.View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* Date Picker Modal */}
                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}

                    {/* Image Section - Premium Design - Only if Ploppy enabled */}
                    {ploppyEnabled && (
                        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                            <Text style={styles.sectionTitle}>Photo du repas</Text>
                            
                            {selectedImage ? (
                                <View style={styles.imageContainer}>
                                    <Image 
                                        source={{ uri: selectedImage }} 
                                        style={styles.imagePreview}
                                        resizeMode="cover"
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                                        style={styles.imageOverlay}
                                    />
                                    <TouchableOpacity 
                                        style={styles.clearImageButton}
                                        onPress={clearImage}
                                    >
                                        <BlurView intensity={40} tint="dark" style={styles.clearImageBlur}>
                                            <X size={16} color={PREMIUM.white} strokeWidth={2.5} />
                                        </BlurView>
                                    </TouchableOpacity>
                                    
                                    {!analysis && (
                                        <View style={styles.imageReadyBadge}>
                                            <Check size={14} color={PREMIUM.accent} strokeWidth={3} />
                                            <Text style={styles.imageReadyText}>Prête pour analyse</Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.imagePickerContainer}>
                                    <TouchableOpacity
                                        style={styles.imagePickerButton}
                                        onPress={pickFromCamera}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.imagePickerIconContainer}>
                                            <Camera size={28} color={PREMIUM.white} strokeWidth={1.5} />
                                        </View>
                                        <Text style={styles.imagePickerLabel}>Appareil photo</Text>
                                    </TouchableOpacity>
                                    
                                    <View style={styles.imageDivider}>
                                        <View style={styles.imageDividerLine} />
                                        <Text style={styles.imageDividerText}>ou</Text>
                                        <View style={styles.imageDividerLine} />
                                    </View>
                                    
                                    <TouchableOpacity
                                        style={styles.imagePickerButton}
                                        onPress={pickFromGallery}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.imagePickerIconContainer}>
                                            <ImageIcon size={28} color={PREMIUM.white} strokeWidth={1.5} />
                                        </View>
                                        <Text style={styles.imagePickerLabel}>Galerie</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    )}

                    {/* Details for Ploppy - Only if Ploppy enabled */}
                    {ploppyEnabled && (
                        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
                            <View style={styles.detailsHeader}>
                                <Text style={styles.sectionTitle}>Infos pour Ploppy</Text>
                                <View style={styles.detailsOptional}>
                                    <Text style={styles.detailsOptionalText}>Optionnel</Text>
                                </View>
                            </View>
                            <View style={styles.detailsContainer}>
                                <View style={styles.detailsIconRow}>
                                    <Info size={16} color={PREMIUM.purple} />
                                    <Text style={styles.detailsHint}>
                                        Aide Ploppy à mieux évaluer ton repas
                                    </Text>
                                </View>
                                <TextInput
                                    style={styles.detailsInput}
                                    value={additionalDetails}
                                    onChangeText={setAdditionalDetails}
                                    placeholder="Ex: Fait maison, régime IG bas, végétarien..."
                                    placeholderTextColor={PREMIUM.gray600}
                                    multiline
                                    numberOfLines={2}
                                />
                                <View style={styles.detailsTags}>
                                    {['🏠 Fait maison', '🥗 Healthy', '🍖 Protéiné'].map((tag) => (
                                        <TouchableOpacity 
                                            key={tag}
                                            style={styles.detailsTag}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setAdditionalDetails(prev => 
                                                    prev ? `${prev}, ${tag.slice(2)}` : tag.slice(2)
                                                );
                                            }}
                                        >
                                            <Text style={styles.detailsTagText}>{tag}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {/* Ploppy Analysis Button - Premium CTA - Only if Ploppy enabled */}
                    {ploppyEnabled && selectedImage && !analysis && (
                        <Animated.View entering={FadeInUp.delay(300).springify()}>
                            <TouchableOpacity
                                style={[
                                    styles.analyzeButton,
                                    (isAnalyzing || isUploading) && styles.analyzeButtonLoading,
                                ]}
                                onPress={analyzeWithPloppy}
                                disabled={isAnalyzing || isUploading}
                                activeOpacity={0.85}
                            >
                                {isUploading || isAnalyzing ? (
                                    <View style={styles.analyzeButtonContent}>
                                        <ActivityIndicator size="small" color={PREMIUM.black} />
                                        <Text style={styles.analyzeButtonText}>
                                            {currentPhrase}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.analyzeButtonContent}>
                                        <View style={styles.analyzeButtonIcon}>
                                            <Text style={styles.analyzeButtonEmoji}>🐦</Text>
                                        </View>
                                        <View style={styles.analyzeButtonTexts}>
                                            <Text style={styles.analyzeButtonText}>
                                                Analyser avec Ploppy
                                            </Text>
                                            <Text style={styles.analyzeButtonSubtext}>
                                                Score nutritionnel + conseils
                                            </Text>
                                        </View>
                                        <Zap size={18} color={PREMIUM.black} fill={PREMIUM.black} />
                                    </View>
                                )}
                            </TouchableOpacity>
                            
                            <View style={styles.betaRow}>
                                <AlertTriangle size={12} color={PREMIUM.gray600} />
                                <Text style={styles.betaText}>
                                    Fonctionnalité expérimentale
                                </Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Analysis Results - Premium Cards */}
                    {analysis && (
                        <Animated.View entering={FadeInUp.delay(100).duration(300)}>
                            {/* Score Card - Premium Dark Design */}
                            <Animated.View style={[styles.scoreCard, scoreAnimatedStyle]}>
                                <View style={styles.scoreCardInner}>
                                    <View style={styles.scoreHeader}>
                                        <View style={styles.scoreTitleRow}>
                                            <Star size={18} color="#fbbf24" fill="#fbbf24" />
                                            <Text style={styles.scoreTitle}>{analysis.title}</Text>
                                        </View>
                                        <View style={[
                                            styles.scoreBadge,
                                            { backgroundColor: getScoreColor(analysis.score) + '20' }
                                        ]}>
                                            <Text style={[
                                                styles.scoreBadgeText,
                                                { color: getScoreColor(analysis.score) }
                                            ]}>
                                                {getScoreLabel(analysis.score)}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.scoreCircleContainer}>
                                        <LinearGradient
                                            colors={getScoreGradient(analysis.score)}
                                            style={styles.scoreCircle}
                                        >
                                            <Text style={styles.scoreValue}>{analysis.score}</Text>
                                        </LinearGradient>
                                        <Text style={styles.scoreMax}>/100</Text>
                                    </View>
                                    
                                    <Text style={styles.scoreDescription}>
                                        {analysis.description}
                                    </Text>
                                </View>
                            </Animated.View>

                            {/* Suggestions Card */}
                            {analysis.suggestions.length > 0 && (
                                <Animated.View 
                                    entering={SlideInRight.delay(200).springify()}
                                    style={styles.suggestionsCard}
                                >
                                    <View style={styles.suggestionsHeader}>
                                        <View style={styles.suggestionsIconWrap}>
                                            <Lightbulb size={16} color="#fbbf24" />
                                        </View>
                                        <Text style={styles.suggestionsTitle}>
                                            Conseils de Ploppy
                                        </Text>
                                    </View>
                                    
                                    {analysis.suggestions.map((suggestion, index) => (
                                        <Animated.View 
                                            key={index} 
                                            entering={FadeInDown.delay(300 + index * 80).springify()}
                                            style={styles.suggestionItem}
                                        >
                                            <View style={styles.suggestionBullet}>
                                                <ChevronRight size={12} color={PREMIUM.teal} strokeWidth={3} />
                                            </View>
                                            <Text style={styles.suggestionText}>{suggestion}</Text>
                                        </Animated.View>
                                    ))}
                                </Animated.View>
                            )}
                        </Animated.View>
                    )}

                    {/* Manual Description - Premium Input */}
                    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <View style={styles.descriptionContainer}>
                            <TextInput
                                style={styles.descriptionInput}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Décris ton repas..."
                                placeholderTextColor={PREMIUM.gray600}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    </Animated.View>

                    {/* Save Button - Premium CTA */}
                    <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                isSaving && styles.saveButtonDisabled,
                            ]}
                            onPress={saveMeal}
                            disabled={isSaving}
                            activeOpacity={0.85}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color={PREMIUM.white} />
                            ) : (
                                <>
                                    <Save size={18} color={PREMIUM.white} strokeWidth={2.5} />
                                    <Text style={styles.saveButtonText}>
                                        Enregistrer le repas
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </SafeAreaView>
            
            {/* Custom Alert Modal */}
            <CustomAlertModal
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                buttons={alertState.buttons}
                onClose={hideAlert}
            />
            
            {/* Ploppy Onboarding Modal */}
            <PloppyOnboardingModal
                visible={showOnboarding}
                onAccept={() => setShowOnboarding(false)}
                onDecline={() => setShowOnboarding(false)}
            />
            
            {/* Ploppy Settings Sheet */}
            <PloppySettingsSheet ref={settingsSheetRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PREMIUM.black,
    },
    safeArea: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },

    // Header Premium
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        marginBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: PREMIUM.gray900,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PREMIUM.white,
        letterSpacing: -0.3,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: PREMIUM.gray900,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    headerBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: PREMIUM.accent,
        letterSpacing: 0.5,
    },
    headerRight: {
        width: 44,
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: PREMIUM.gray900,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
    },

    // Section Titles
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: PREMIUM.gray400,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dateButton: {
        backgroundColor: PREMIUM.gray900,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
    },
    dateButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: PREMIUM.gray400,
    },

    // Time Grid 2x2
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 28,
    },
    timeCard: {
        backgroundColor: PREMIUM.gray900,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
        alignItems: 'center',
        position: 'relative',
        minHeight: 100,
        justifyContent: 'center',
    },
    timeCardSelected: {
        backgroundColor: PREMIUM.white,
        borderColor: PREMIUM.white,
    },
    timeCardEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    timeCardLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: PREMIUM.white,
        marginBottom: 2,
    },
    timeCardLabelSelected: {
        color: PREMIUM.black,
    },
    timeCardTime: {
        fontSize: 11,
        color: PREMIUM.gray600,
    },
    timeCardTimeSelected: {
        color: PREMIUM.gray600,
    },
    timeCardCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: PREMIUM.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Image Section
    imageContainer: {
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 28,
        backgroundColor: PREMIUM.gray900,
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
    },
    imagePreview: {
        width: '100%',
        height: 240,
        backgroundColor: PREMIUM.gray800,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    clearImageButton: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    clearImageBlur: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    imageReadyBadge: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    imageReadyText: {
        fontSize: 12,
        fontWeight: '600',
        color: PREMIUM.white,
    },
    imagePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PREMIUM.gray900,
        borderRadius: 20,
        padding: 24,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
        borderStyle: 'dashed',
    },
    imagePickerButton: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    imagePickerIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: PREMIUM.gray800,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePickerLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: PREMIUM.gray200,
    },
    imageDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    imageDividerLine: {
        width: 1,
        height: 40,
        backgroundColor: PREMIUM.gray800,
    },
    imageDividerText: {
        fontSize: 12,
        color: PREMIUM.gray600,
        paddingHorizontal: 8,
    },

    // Details Section (NEW)
    detailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailsOptional: {
        backgroundColor: PREMIUM.gray900,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    detailsOptionalText: {
        fontSize: 10,
        fontWeight: '500',
        color: PREMIUM.gray600,
    },
    detailsContainer: {
        backgroundColor: PREMIUM.gray900,
        borderRadius: 16,
        padding: 16,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
    },
    detailsIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    detailsHint: {
        fontSize: 12,
        color: PREMIUM.gray400,
    },
    detailsInput: {
        fontSize: 14,
        color: PREMIUM.white,
        minHeight: 50,
        textAlignVertical: 'top',
    },
    detailsTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: PREMIUM.gray800,
    },
    detailsTag: {
        backgroundColor: PREMIUM.gray800,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    detailsTagText: {
        fontSize: 12,
        color: PREMIUM.gray200,
    },

    // Analyze Button (Premium)
    analyzeButton: {
        backgroundColor: PREMIUM.accent,
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    analyzeButtonLoading: {
        opacity: 0.8,
    },
    analyzeButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    analyzeButtonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyzeButtonEmoji: {
        fontSize: 24,
    },
    analyzeButtonTexts: {
        flex: 1,
    },
    analyzeButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: PREMIUM.black,
    },
    analyzeButtonSubtext: {
        fontSize: 12,
        color: 'rgba(0,0,0,0.6)',
        marginTop: 1,
    },
    betaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 28,
    },
    betaText: {
        fontSize: 11,
        color: PREMIUM.gray600,
    },

    // Score Card (Premium Dark)
    scoreCard: {
        marginBottom: 20,
    },
    scoreCardInner: {
        backgroundColor: PREMIUM.gray900,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
    },
    scoreHeader: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    scoreTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    scoreTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: PREMIUM.white,
        flex: 1,
    },
    scoreBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    scoreBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    scoreCircleContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    scoreCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: '800',
        color: PREMIUM.white,
    },
    scoreMax: {
        fontSize: 16,
        fontWeight: '600',
        color: PREMIUM.gray400,
    },
    scoreDescription: {
        fontSize: 14,
        color: PREMIUM.gray200,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Suggestions Card
    suggestionsCard: {
        backgroundColor: PREMIUM.gray900,
        borderRadius: 20,
        padding: 20,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
    },
    suggestionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    suggestionsIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    suggestionsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: PREMIUM.white,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 12,
    },
    suggestionBullet: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: PREMIUM.gray800,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    suggestionText: {
        flex: 1,
        fontSize: 14,
        color: PREMIUM.gray200,
        lineHeight: 22,
    },

    // Description
    descriptionContainer: {
        backgroundColor: PREMIUM.gray900,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: PREMIUM.gray800,
        marginBottom: 28,
        overflow: 'hidden',
    },
    descriptionInput: {
        padding: 16,
        fontSize: 14,
        color: PREMIUM.white,
        minHeight: 100,
    },

    // Save Button
    saveButton: {
        backgroundColor: PREMIUM.teal,
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: PREMIUM.white,
    },
});
