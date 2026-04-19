// ============================================================================
// ENHANCED MEAL PAGE - Page d'ajout de repas avec analyse IA
// Design premium avec contraste noir/blanc et animations fluides
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
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
} from 'lucide-react-native';
import { CustomAlertModal } from '../src/components/ui';
import type { AlertButton } from '../src/components/ui';
import { useAppStore } from '../src/stores';
import { 
    isPollinationConnected, 
    analyzeMealImage,
    type MealAnalysis,
} from '../src/services/pollination';
import { uploadImageToTmpFiles } from '../src/services/imageUpload';
import { formatDisplayDate } from '../src/utils/date';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import {
    Colors,
    EnhancedMealPalette as PREMIUM,
    getEnhancedMealScoreColor as getScoreColor,
    getEnhancedMealScoreGradient as getScoreGradient,
} from '../src/constants';
import { styles } from './_enhanced-meal.styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SCORE_EXCELLENT = 85;
const SCORE_VERY_GOOD = 70;
const SCORE_GOOD = 50;
const SCORE_CAN_IMPROVE = 30;

// Score label key based on value
const getScoreLabelKey = (score: number): string => {
    if (score >= SCORE_EXCELLENT) return 'enhancedMeal.scoreLabels.excellent';
    if (score >= SCORE_VERY_GOOD) return 'enhancedMeal.scoreLabels.veryGood';
    if (score >= SCORE_GOOD) return 'enhancedMeal.scoreLabels.good';
    if (score >= SCORE_CAN_IMPROVE) return 'enhancedMeal.scoreLabels.canImprove';
    return 'enhancedMeal.scoreLabels.warning';
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

    const mealTimeOptions = React.useMemo<MealTimeOption[]>(() => [
        {
            value: 'breakfast',
            label: t('enhancedMeal.timeOptions.breakfast.label'),
            emoji: '☀️',
            time: t('enhancedMeal.timeOptions.breakfast.time'),
        },
        {
            value: 'lunch',
            label: t('enhancedMeal.timeOptions.lunch.label'),
            emoji: '🌤️',
            time: t('enhancedMeal.timeOptions.lunch.time'),
        },
        {
            value: 'dinner',
            label: t('enhancedMeal.timeOptions.dinner.label'),
            emoji: '🌙',
            time: t('enhancedMeal.timeOptions.dinner.time'),
        },
        {
            value: 'snack',
            label: t('enhancedMeal.timeOptions.snack.label'),
            emoji: '🍎',
            time: t('enhancedMeal.timeOptions.snack.time'),
        },
    ], [t]);

    const detailTags = React.useMemo(() => [
        { key: 'homemade', emoji: '🏠', label: t('enhancedMeal.detailsTags.homemade') },
        { key: 'healthy', emoji: '🥗', label: t('enhancedMeal.detailsTags.healthy') },
        { key: 'proteinRich', emoji: '🍖', label: t('enhancedMeal.detailsTags.proteinRich') },
    ], [t]);
    
    // Global AI lock: Ploppy stays disabled while IA is unavailable.
    const aiFeaturesEnabled = settings.aiFeaturesEnabled ?? false;
    const ploppyEnabled = aiFeaturesEnabled && (settings.ploppyEnabled ?? false);

    // State
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

    const funnyPhrases = React.useMemo(() => [
        t('enhancedMeal.analysisPhrases.wakingUp'),
        t('enhancedMeal.analysisPhrases.analyzingPlate'),
        t('enhancedMeal.analysisPhrases.countingCalories'),
        t('enhancedMeal.analysisPhrases.thinkingHard'),
        t('enhancedMeal.analysisPhrases.checkingKnowledge'),
        t('enhancedMeal.analysisPhrases.looksTasty'),
        t('enhancedMeal.analysisPhrases.takingNotes'),
        t('enhancedMeal.analysisPhrases.virtualTaste'),
        t('enhancedMeal.analysisPhrases.checkingRecipe'),
        t('enhancedMeal.analysisPhrases.calculating'),
    ], [t]);
    const [currentPhrase, setCurrentPhrase] = React.useState(() => funnyPhrases[0]);

    // Helper to show alert
    const showAlert = useCallback((
        title: string, 
        message: string, 
        type: AlertState['type'] = 'info',
        buttons?: AlertButton[]
    ) => {
        setAlertState({
            visible: true,
            title,
            message,
            type,
            buttons: buttons ?? [{ text: t('common.ok'), style: 'default' }],
        });
    }, [t]);

    const hideAlert = useCallback(() => {
        setAlertState(prev => ({ ...prev, visible: false }));
    }, []);

    // Check if Pollination is connected
    const checkPollinationConnection = useCallback(async () => {
        if (!aiFeaturesEnabled) {
            return false;
        }
        const connected = await isPollinationConnected();
        return connected;
    }, [aiFeaturesEnabled]);

    // Initial check
    React.useEffect(() => {
        checkPollinationConnection();
    }, [checkPollinationConnection]);

    // Change funny phrase periodically during upload/analysis
    React.useEffect(() => {
        setCurrentPhrase(funnyPhrases[0]);
    }, [funnyPhrases]);

    React.useEffect(() => {
        if (isUploading || isAnalyzing) {
            let index = 0;
            const interval = setInterval(() => {
                index = (index + 1) % funnyPhrases.length;
                setCurrentPhrase(funnyPhrases[index]);
            }, 1500);
            return () => clearInterval(interval);
        }
    }, [isUploading, isAnalyzing, funnyPhrases]);

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
                throw new Error(uploadResult.error || 'upload_failed');
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
    const saveMeal = useCallback(() => {
        const mealNames: Record<MealTime, string> = {
            breakfast: `☀️ ${t('enhancedMeal.timeOptions.breakfast.label')}`,
            lunch: `🌤️ ${t('enhancedMeal.timeOptions.lunch.label')}`,
            dinner: `🌙 ${t('enhancedMeal.timeOptions.dinner.label')}`,
            snack: `🍎 ${t('enhancedMeal.timeOptions.snack.label')}`,
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
                [{ text: t('common.ok'), onPress: () => router.back() }]
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
    const onDateChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
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
                            <Text style={styles.headerTitle}>{t('enhancedMeal.title')}</Text>
                            {ploppyEnabled && (
                                <View style={styles.headerBadge}>
                                    <Sparkles size={10} color={PREMIUM.accent} />
                                    <Text style={styles.headerBadgeText}>{t('settings.aiTab')}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.headerRight} />
                    </Animated.View>

                    {/* Meal Time Selection - 2x2 Grid */}
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('enhancedMeal.mealTime')}</Text>
                            <TouchableOpacity 
                                style={styles.dateButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowDatePicker(true);
                                }}
                            >
                                <Text style={styles.dateButtonText}>
                                    {formatDisplayDate(format(selectedDate, 'yyyy-MM-dd'))}
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
                            <Text style={styles.sectionTitle}>{t('enhancedMeal.photo')}</Text>
                            
                            {selectedImage ? (
                                <View style={styles.imageContainer}>
                                    <Image 
                                        source={{ uri: selectedImage }} 
                                        accessibilityLabel={t('enhancedMeal.photo', { defaultValue: 'Meal photo' })}
                                        style={styles.imagePreview}
                                        resizeMode="cover"
                                    />
                                    <LinearGradient
                                        colors={[Colors.transparent, Colors.overlayBlack80]}
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
                                            <Text style={styles.imageReadyText}>{t('enhancedMeal.readyForAnalysis')}</Text>
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
                                        <Text style={styles.imagePickerLabel}>{t('enhancedMeal.camera')}</Text>
                                    </TouchableOpacity>
                                    
                                    <View style={styles.imageDivider}>
                                        <View style={styles.imageDividerLine} />
                                        <Text style={styles.imageDividerText}>{t('enhancedMeal.or')}</Text>
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
                                        <Text style={styles.imagePickerLabel}>{t('enhancedMeal.gallery')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    )}

                    {/* Details for Ploppy - Only if Ploppy enabled */}
                    {ploppyEnabled && (
                        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
                            <View style={styles.detailsHeader}>
                                <Text style={styles.sectionTitle}>{t('enhancedMeal.detailsTitle')}</Text>
                                <View style={styles.detailsOptional}>
                                    <Text style={styles.detailsOptionalText}>{t('enhancedMeal.optional')}</Text>
                                </View>
                            </View>
                            <View style={styles.detailsContainer}>
                                <View style={styles.detailsIconRow}>
                                    <Info size={16} color={PREMIUM.purple} />
                                    <Text style={styles.detailsHint}>
                                        {t('enhancedMeal.detailsHint')}
                                    </Text>
                                </View>
                                <TextInput
                                    style={styles.detailsInput}
                                    value={additionalDetails}
                                    onChangeText={setAdditionalDetails}
                                    placeholder={t('enhancedMeal.detailsPlaceholder')}
                                    placeholderTextColor={PREMIUM.gray600}
                                    multiline
                                    numberOfLines={2}
                                />
                                <View style={styles.detailsTags}>
                                    {detailTags.map((tag) => (
                                        <TouchableOpacity 
                                            key={tag.key}
                                            style={styles.detailsTag}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setAdditionalDetails(prev => 
                                                    prev ? `${prev}, ${tag.label}` : tag.label
                                                );
                                            }}
                                        >
                                            <Text style={styles.detailsTagText}>{`${tag.emoji} ${tag.label}`}</Text>
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
                                                {t('enhancedMeal.askPloppy')}
                                            </Text>
                                            <Text style={styles.analyzeButtonSubtext}>
                                                {t('enhancedMeal.askPloppySubtitle')}
                                            </Text>
                                        </View>
                                        <Zap size={18} color={PREMIUM.black} fill={PREMIUM.black} />
                                    </View>
                                )}
                            </TouchableOpacity>
                            
                            <View style={styles.betaRow}>
                                <AlertTriangle size={12} color={PREMIUM.gray600} />
                                <Text style={styles.betaText}>
                                    {t('enhancedMeal.experimentalFeature')}
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
                                            <Star size={18} color={Colors.warning} fill={Colors.warning} />
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
                                                {t(getScoreLabelKey(analysis.score))}
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
                                            <Lightbulb size={16} color={Colors.warning} />
                                        </View>
                                        <Text style={styles.suggestionsTitle}>
                                            {t('enhancedMeal.suggestions')}
                                        </Text>
                                    </View>
                                    
                                    {analysis.suggestions.map((suggestion, index) => (
                                        <Animated.View 
                                            key={`${suggestion}-${index}`} 
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
                        <Text style={styles.sectionTitle}>{t('enhancedMeal.description')}</Text>
                        <View style={styles.descriptionContainer}>
                            <TextInput
                                style={styles.descriptionInput}
                                value={description}
                                onChangeText={setDescription}
                                placeholder={t('enhancedMeal.descriptionPlaceholder')}
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
                                        {t('enhancedMeal.save')}
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
        </View>
    );
}

