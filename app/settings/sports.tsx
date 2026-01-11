// ============================================================================
// SPORTS MANAGEMENT SETTINGS - Add, hide, customize sports
// ============================================================================

import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
    ChevronLeft,
    Plus,
    Eye,
    EyeOff,
    Trash2,
    Check,
    Dumbbell,
    Footprints,
    Gamepad2,
    Bike,
    Flame,
    Heart,
    Timer,
    Zap,
    Target,
    Mountain,
    Waves,
    Sword,
    Music,
    Sparkles,
} from 'lucide-react-native';
import { GlassCard, Button } from '../../src/components/ui';
import { useAppStore, useSportsConfig } from '../../src/stores';
import type { SportConfig, SportTrackingField } from '../../src/types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';

// ============================================================================
// CONSTANTS
// ============================================================================

// Available icons for custom sports
const AVAILABLE_ICONS = [
    { name: 'Dumbbell', icon: Dumbbell },
    { name: 'Footprints', icon: Footprints },
    { name: 'Gamepad2', icon: Gamepad2 },
    { name: 'Bike', icon: Bike },
    { name: 'Flame', icon: Flame },
    { name: 'Heart', icon: Heart },
    { name: 'Timer', icon: Timer },
    { name: 'Zap', icon: Zap },
    { name: 'Target', icon: Target },
    { name: 'Mountain', icon: Mountain },
    { name: 'Waves', icon: Waves },
    { name: 'Sword', icon: Sword },
    { name: 'Music', icon: Music },
    { name: 'Sparkles', icon: Sparkles },
] as const;

// Available colors for custom sports
const AVAILABLE_COLORS = [
    '#8B5CF6', // Purple
    '#22C55E', // Green
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16', // Lime
];

// Available emojis
const AVAILABLE_EMOJIS = [
    '💪', '🏃', '🕹️', '🚴', '🏊', '⚽', '🏀', '🎾', '🥊', '🧘',
    '🏋️', '🤸', '⛷️', '🏂', '🎯', '🎸', '🎭', '🧗', '🤺', '🏓',
];

// Available tracking fields
const TRACKING_FIELDS: { id: SportTrackingField; labelKey: string; icon: typeof Timer }[] = [
    { id: 'duration', labelKey: 'settings.sports.fields.duration', icon: Timer },
    { id: 'distance', labelKey: 'settings.sports.fields.distance', icon: Footprints },
    { id: 'bpmAvg', labelKey: 'settings.sports.fields.bpmAvg', icon: Heart },
    { id: 'bpmMax', labelKey: 'settings.sports.fields.bpmMax', icon: Heart },
    { id: 'cardiacLoad', labelKey: 'settings.sports.fields.cardiacLoad', icon: Flame },
    { id: 'calories', labelKey: 'settings.sports.fields.calories', icon: Zap },
    { id: 'exercises', labelKey: 'settings.sports.fields.exercises', icon: Dumbbell },
    { id: 'totalReps', labelKey: 'settings.sports.fields.totalReps', icon: Target },
];

// ============================================================================
// SPORT CARD COMPONENT
// ============================================================================

function SportCard({
    sport,
    onToggleVisibility,
    onDelete,
    delay = 0,
}: {
    sport: SportConfig;
    onToggleVisibility: () => void;
    onDelete?: () => void;
    delay?: number;
}) {
    const { t } = useTranslation();
    const IconComponent = AVAILABLE_ICONS.find(i => i.name === sport.icon)?.icon || Dumbbell;

    return (
        <Animated.View 
            entering={FadeInDown.delay(delay).springify()}
            layout={Layout.springify()}
        >
            <View style={[styles.sportCard, sport.isHidden && styles.sportCardHidden]}>
                {/* Left accent */}
                <View style={[styles.sportAccent, { backgroundColor: sport.color }]} />
                
                {/* Content */}
                <View style={styles.sportContent}>
                    <View style={styles.sportInfo}>
                        <View style={[styles.sportIconContainer, { backgroundColor: sport.color + '20' }]}>
                            <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                        </View>
                        <View style={styles.sportDetails}>
                            <Text style={[styles.sportName, sport.isHidden && styles.sportNameHidden]}>
                                {sport.name}
                            </Text>
                            <Text style={styles.sportMeta}>
                                {sport.isDefault 
                                    ? t('settings.sports.default') 
                                    : t('settings.sports.custom')
                                }
                                {sport.isHidden && ` • ${t('settings.sports.hidden')}`}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Actions */}
                    <View style={styles.sportActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onToggleVisibility}
                        >
                            {sport.isHidden ? (
                                <EyeOff size={20} color={Colors.muted} />
                            ) : (
                                <Eye size={20} color={sport.color} />
                            )}
                        </TouchableOpacity>
                        
                        {!sport.isDefault && onDelete && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={onDelete}
                            >
                                <Trash2 size={20} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============================================================================
// ADD SPORT SHEET
// ============================================================================

interface AddSportSheetRef {
    present: () => void;
    dismiss: () => void;
}

const AddSportSheet = React.forwardRef<AddSportSheetRef, { onSave: (sport: Omit<SportConfig, 'id' | 'isDefault'>) => void }>(
    ({ onSave }, ref) => {
        const { t } = useTranslation();
        const sheetRef = useRef<TrueSheet>(null);
        
        // Form state
        const [name, setName] = useState('');
        const [emoji, setEmoji] = useState('💪');
        const [icon, setIcon] = useState('Dumbbell');
        const [color, setColor] = useState('#8B5CF6');
        const [trackingFields, setTrackingFields] = useState<SportTrackingField[]>(['duration']);
        
        React.useImperativeHandle(ref, () => ({
            present: () => sheetRef.current?.present(),
            dismiss: () => sheetRef.current?.dismiss(),
        }));
        
        const toggleField = (field: SportTrackingField) => {
            setTrackingFields(prev => 
                prev.includes(field) 
                    ? prev.filter(f => f !== field)
                    : [...prev, field]
            );
        };
        
        const handleSave = () => {
            if (!name.trim()) {
                Alert.alert(t('common.error'), t('settings.sports.errorNoName'));
                return;
            }
            if (trackingFields.length === 0) {
                Alert.alert(t('common.error'), t('settings.sports.errorNoFields'));
                return;
            }
            
            onSave({
                name: name.trim(),
                emoji,
                icon,
                color,
                trackingFields,
                isHidden: false,
            });
            
            // Reset form
            setName('');
            setEmoji('💪');
            setIcon('Dumbbell');
            setColor('#8B5CF6');
            setTrackingFields(['duration']);
            sheetRef.current?.dismiss();
        };

        const SelectedIcon = AVAILABLE_ICONS.find(i => i.name === icon)?.icon || Dumbbell;

        return (
            <TrueSheet
                ref={sheetRef}
                detents={['large']}
                cornerRadius={32}
                backgroundColor={Colors.bg}
                grabber={false}
                scrollable={true}
            >
                <ScrollView style={styles.sheetContainer} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <View style={styles.grabber} />
                        <Text style={styles.sheetTitle}>
                            {t('settings.sports.addTitle')}
                        </Text>
                        <Text style={styles.sheetSubtitle}>
                            {t('settings.sports.addSubtitle')}
                        </Text>
                    </View>
                    
                    {/* Preview */}
                    <View style={styles.previewSection}>
                        <Text style={styles.sectionLabel}>{t('settings.sports.preview')}</Text>
                        <View style={[styles.previewCard, { borderColor: color }]}>
                            <View style={[styles.previewAccent, { backgroundColor: color }]} />
                            <View style={[styles.previewIcon, { backgroundColor: color + '20' }]}>
                                <Text style={styles.previewEmoji}>{emoji}</Text>
                            </View>
                            <View style={styles.previewInfo}>
                                <Text style={styles.previewName}>{name || t('settings.sports.namePlaceholder')}</Text>
                                <Text style={styles.previewMeta}>{t('settings.sports.custom')}</Text>
                            </View>
                            <SelectedIcon size={24} color={color} />
                        </View>
                    </View>
                    
                    {/* Name input */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionLabel}>{t('settings.sports.nameLabel')}</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder={t('settings.sports.namePlaceholder')}
                            placeholderTextColor={Colors.muted}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                    
                    {/* Emoji selector */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionLabel}>{t('settings.sports.emojiLabel')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.emojiRow}>
                                {AVAILABLE_EMOJIS.map((e) => (
                                    <TouchableOpacity
                                        key={e}
                                        style={[
                                            styles.emojiButton,
                                            emoji === e && { backgroundColor: color + '30', borderColor: color },
                                        ]}
                                        onPress={() => setEmoji(e)}
                                    >
                                        <Text style={styles.emojiText}>{e}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                    
                    {/* Icon selector */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionLabel}>{t('settings.sports.iconLabel')}</Text>
                        <View style={styles.iconGrid}>
                            {AVAILABLE_ICONS.map(({ name: iconName, icon: IconComp }) => (
                                <TouchableOpacity
                                    key={iconName}
                                    style={[
                                        styles.iconButton,
                                        icon === iconName && { backgroundColor: color + '30', borderColor: color },
                                    ]}
                                    onPress={() => setIcon(iconName)}
                                >
                                    <IconComp size={24} color={icon === iconName ? color : Colors.muted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    
                    {/* Color selector */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionLabel}>{t('settings.sports.colorLabel')}</Text>
                        <View style={styles.colorRow}>
                            {AVAILABLE_COLORS.map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    style={[
                                        styles.colorButton,
                                        { backgroundColor: c },
                                        color === c && styles.colorButtonSelected,
                                    ]}
                                    onPress={() => setColor(c)}
                                >
                                    {color === c && <Check size={16} color="#fff" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    
                    {/* Tracking fields */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionLabel}>{t('settings.sports.fieldsLabel')}</Text>
                        <Text style={styles.fieldHint}>{t('settings.sports.fieldsHint')}</Text>
                        <View style={styles.fieldsGrid}>
                            {TRACKING_FIELDS.map(({ id, labelKey, icon: FieldIcon }) => (
                                <TouchableOpacity
                                    key={id}
                                    style={[
                                        styles.fieldButton,
                                        trackingFields.includes(id) && { 
                                            backgroundColor: color + '20', 
                                            borderColor: color 
                                        },
                                    ]}
                                    onPress={() => toggleField(id)}
                                >
                                    <FieldIcon 
                                        size={18} 
                                        color={trackingFields.includes(id) ? color : Colors.muted} 
                                    />
                                    <Text style={[
                                        styles.fieldLabel,
                                        trackingFields.includes(id) && { color }
                                    ]}>
                                        {t(labelKey)}
                                    </Text>
                                    {trackingFields.includes(id) && (
                                        <Check size={14} color={color} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    
                    {/* Save button */}
                    <View style={styles.sheetFooter}>
                        <Button
                            title={t('settings.sports.save')}
                            onPress={handleSave}
                            variant="cta"
                            style={{ flex: 1 }}
                        />
                    </View>
                    
                    <View style={{ height: 50 }} />
                </ScrollView>
            </TrueSheet>
        );
    }
);

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function SportsManagementScreen() {
    const { t } = useTranslation();
    const sportsConfig = useSportsConfig();
    const { addSportConfig, toggleSportVisibility, deleteSportConfig } = useAppStore();
    const addSheetRef = useRef<AddSportSheetRef>(null);

    const handleDelete = useCallback((sport: SportConfig) => {
        Alert.alert(
            t('settings.sports.deleteTitle'),
            t('settings.sports.deleteMessage', { name: sport.name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { 
                    text: t('common.delete'), 
                    style: 'destructive',
                    onPress: () => deleteSportConfig(sport.id),
                },
            ]
        );
    }, [t, deleteSportConfig]);

    const handleAddSport = useCallback((sport: Omit<SportConfig, 'id' | 'isDefault'>) => {
        addSportConfig(sport);
    }, [addSportConfig]);

    // Separate default and custom sports
    const defaultSports = sportsConfig.filter((s: SportConfig) => s.isDefault);
    const customSports = sportsConfig.filter((s: SportConfig) => !s.isDefault);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                >
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {t('settings.manageSports', { defaultValue: 'Gérer mes sports' })}
                </Text>
                <TouchableOpacity 
                    onPress={() => addSheetRef.current?.present()} 
                    style={styles.addButton}
                >
                    <Plus size={24} color={Colors.cta} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Info card */}
                <Animated.View entering={FadeIn.delay(100)}>
                    <LinearGradient
                        colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']}
                        style={styles.infoCard}
                    >
                        <Dumbbell size={20} color="#8B5CF6" />
                        <Text style={styles.infoText}>
                            {t('settings.sports.infoText')}
                        </Text>
                    </LinearGradient>
                </Animated.View>

                {/* Default sports */}
                <Animated.View entering={FadeIn.delay(150)}>
                    <Text style={styles.sectionTitle}>
                        {t('settings.sports.defaultSports')}
                    </Text>
                </Animated.View>
                
                {defaultSports.map((sport: SportConfig, index: number) => (
                    <SportCard
                        key={sport.id}
                        sport={sport}
                        onToggleVisibility={() => toggleSportVisibility(sport.id)}
                        delay={200 + index * 50}
                    />
                ))}

                {/* Custom sports */}
                {customSports.length > 0 && (
                    <>
                        <Animated.View entering={FadeIn.delay(350)}>
                            <Text style={styles.sectionTitle}>
                                {t('settings.sports.customSports')}
                            </Text>
                        </Animated.View>
                        
                        {customSports.map((sport: SportConfig, index: number) => (
                            <SportCard
                                key={sport.id}
                                sport={sport}
                                onToggleVisibility={() => toggleSportVisibility(sport.id)}
                                onDelete={() => handleDelete(sport)}
                                delay={400 + index * 50}
                            />
                        ))}
                    </>
                )}

                {/* Add button */}
                <Animated.View entering={FadeInDown.delay(500)}>
                    <TouchableOpacity 
                        style={styles.addSportButton}
                        onPress={() => addSheetRef.current?.present()}
                    >
                        <LinearGradient
                            colors={[Colors.cta + '30', Colors.cta + '10']}
                            style={styles.addSportGradient}
                        >
                            <Plus size={24} color={Colors.cta} />
                            <Text style={styles.addSportText}>
                                {t('settings.sports.addButton')}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add sport sheet */}
            <AddSportSheet ref={addSheetRef} onSave={handleAddSport} />
        </SafeAreaView>
    );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.cta + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    infoText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.muted,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        marginBottom: Spacing.sm,
        marginTop: Spacing.md,
    },
    sportCard: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
    },
    sportCardHidden: {
        opacity: 0.6,
    },
    sportAccent: {
        width: 4,
    },
    sportContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
    },
    sportInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    sportIconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sportEmoji: {
        fontSize: 22,
    },
    sportDetails: {
        gap: 2,
    },
    sportName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    sportNameHidden: {
        color: Colors.muted,
    },
    sportMeta: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    sportActions: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addSportButton: {
        marginTop: Spacing.lg,
    },
    addSportGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.cta + '30',
        borderStyle: 'dashed',
    },
    addSportText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.cta,
    },
    // Sheet styles
    sheetContainer: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    sheetHeader: {
        alignItems: 'center',
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.lg,
    },
    grabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: Spacing.md,
    },
    sheetTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    sheetSubtitle: {
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    previewSection: {
        marginBottom: Spacing.lg,
    },
    sectionLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.muted,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 2,
        gap: Spacing.sm,
    },
    previewAccent: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginLeft: -Spacing.md,
    },
    previewIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewEmoji: {
        fontSize: 22,
    },
    previewInfo: {
        flex: 1,
    },
    previewName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    previewMeta: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    formSection: {
        marginBottom: Spacing.lg,
    },
    textInput: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.text,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    emojiRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    emojiButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    emojiText: {
        fontSize: 24,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    colorButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorButtonSelected: {
        borderWidth: 3,
        borderColor: '#fff',
    },
    fieldsGrid: {
        gap: Spacing.xs,
    },
    fieldButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    fieldLabel: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    fieldHint: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginBottom: Spacing.sm,
    },
    sheetFooter: {
        flexDirection: 'row',
        paddingTop: Spacing.lg,
    },
});
