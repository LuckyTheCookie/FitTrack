// ============================================================================
// SETTINGS - APPEARANCE SUB-SCREEN
// ============================================================================

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  DevSettings,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
  ZoomIn,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Eye,
  Trophy,
  Palette,
  RotateCcw,
  Check,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { useAppStore } from '../../src/stores';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  applyThemeFromUserSettings,
  DEFAULT_THEME_CUSTOM_COLORS,
  THEME_PRESET_COLORS,
  normalizeThemeHexColor,
} from '../../src/constants';
import type { ThemeCustomColors, ThemePreset } from '../../src/types';

// ─── Theme Cards Config ───────────────────────────────────────────────────────

const THEME_CARDS: Array<{
  id: Exclude<ThemePreset, 'custom'>;
  labelKey: string;
  emoji: string;
  gradient: [string, string, string];
  accentA: string;
  accentB: string;
  descriptionKey: string;
}> = [
  {
    id: 'default',
    labelKey: 'settings.appearanceThemeDefaultLabel',
    emoji: '▲',
    gradient: ['#0a0a0a', '#1a0800', '#2a0e00'],
    accentA: '#ff5533',
    accentB: '#ff7a55',
    descriptionKey: 'settings.appearanceThemeDefaultDesc',
  },
  {
    id: 'ocean',
    labelKey: 'settings.appearanceThemeOceanLabel',
    emoji: '◎',
    gradient: ['#0d1b2a', '#1b4332', '#0077b6'],
    accentA: '#00b4d8',
    accentB: '#48cae4',
    descriptionKey: 'settings.appearanceThemeOceanDesc',
  },
  {
    id: 'sunset',
    labelKey: 'settings.appearanceThemeSunsetLabel',
    emoji: '◈',
    gradient: ['#2d1b00', '#7c3f00', '#c0392b'],
    accentA: '#ff6b35',
    accentB: '#ffd700',
    descriptionKey: 'settings.appearanceThemeSunsetDesc',
  },
  {
    id: 'forest',
    labelKey: 'settings.appearanceThemeForestLabel',
    emoji: '⬡',
    gradient: ['#0a1a0e', '#1a3a1f', '#2d5a27'],
    accentA: '#52b788',
    accentB: '#b7e4c7',
    descriptionKey: 'settings.appearanceThemeForestDesc',
  },
  {
    id: 'midnight',
    labelKey: 'settings.appearanceThemeMidnightLabel',
    emoji: '◇',
    gradient: ['#0a0a0f', '#12121a', '#1a1a2e'],
    accentA: '#9b59b6',
    accentB: '#e056fd',
    descriptionKey: 'settings.appearanceThemeMidnightDesc',
  },
];

const CUSTOM_FIELDS: Array<{ key: keyof ThemeCustomColors; labelKey: string; groupKey: string }> = [
  { key: 'bg', labelKey: 'settings.appearanceFieldBg', groupKey: 'settings.appearanceGroupBase' },
  { key: 'surface', labelKey: 'settings.appearanceFieldSurface', groupKey: 'settings.appearanceGroupBase' },
  { key: 'text', labelKey: 'settings.appearanceFieldText', groupKey: 'settings.appearanceGroupBase' },
  { key: 'muted', labelKey: 'settings.appearanceFieldMuted', groupKey: 'settings.appearanceGroupBase' },
  { key: 'primary', labelKey: 'settings.appearanceFieldPrimary', groupKey: 'settings.appearanceGroupActions' },
  { key: 'secondary', labelKey: 'settings.appearanceFieldSecondary', groupKey: 'settings.appearanceGroupActions' },
  { key: 'success', labelKey: 'settings.appearanceFieldSuccess', groupKey: 'settings.appearanceGroupStates' },
  { key: 'warning', labelKey: 'settings.appearanceFieldWarning', groupKey: 'settings.appearanceGroupStates' },
  { key: 'error', labelKey: 'settings.appearanceFieldError', groupKey: 'settings.appearanceGroupStates' },
  { key: 'info', labelKey: 'settings.appearanceFieldInfo', groupKey: 'settings.appearanceGroupStates' },
  { key: 'violet', labelKey: 'settings.appearanceFieldViolet', groupKey: 'settings.appearanceGroupAccents' },
  { key: 'rose', labelKey: 'settings.appearanceFieldRose', groupKey: 'settings.appearanceGroupAccents' },
  { key: 'gold', labelKey: 'settings.appearanceFieldGold', groupKey: 'settings.appearanceGroupAccents' },
];

// ─── Animated Theme Card ──────────────────────────────────────────────────────

function ThemeCard({
  theme,
  isActive,
  onPress,
  delay,
}: {
  theme: (typeof THEME_CARDS)[0];
  isActive: boolean;
  onPress: () => void;
  delay: number;
}) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const glow = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    glow.value = withTiming(isActive ? 1 : 0, { duration: 350 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 1]),
    borderColor: theme.accentA,
    borderWidth: interpolate(glow.value, [0, 1], [1, 2]),
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.94, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    runOnJS(onPress)();
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay)
} style={[styles.themeCardWrapper]}>
      <Pressable onPress={handlePress} style={styles.themeCardPressable}>
        <Animated.View style={[styles.themeCard, animatedStyle]}>
          {/* Gradient bg */}
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Active border glow */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.themeCardBorder, glowStyle]} />

          {/* Content */}
          <View style={styles.themeCardInner}>
            {/* Decorative accent blobs */}
            <View style={[styles.blob, { backgroundColor: theme.accentA, top: -10, right: -10 }]} />
            <View style={[styles.blob2, { backgroundColor: theme.accentB, bottom: 4, left: 0 }]} />

            {/* Emoji glyph */}
            <Text style={[styles.themeEmoji, { color: theme.accentA }]}>{theme.emoji}</Text>

            {/* Swatches */}
            <View style={styles.themeSwatches}>
              <View style={[styles.themeSwatchDot, { backgroundColor: theme.accentA }]} />
              <View style={[styles.themeSwatchDot, { backgroundColor: theme.accentB, opacity: 0.7 }]} />
              <View style={[styles.themeSwatchDot, { backgroundColor: '#ffffff20' }]} />
            </View>

            {/* Labels */}
            <Text style={styles.themeCardLabel}>{t(theme.labelKey)}</Text>
            <Text style={styles.themeCardDesc}>{t(theme.descriptionKey)}</Text>

            {/* Check badge */}
            {isActive && (
              <Animated.View entering={ZoomIn} style={[styles.checkBadge, { backgroundColor: theme.accentA }]}>
                <Check size={10} color="#fff" strokeWidth={3} />
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Toggle Setting Row ───────────────────────────────────────────────────────

function ToggleRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onValueChange,
  delay = 0,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay)}>
      <View style={styles.toggleRow}>
        <View style={[styles.toggleIcon, { backgroundColor: `${iconColor}18`, borderColor: `${iconColor}28` }]}>
          {icon}
        </View>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>{title}</Text>
          {subtitle ? <Text style={styles.toggleSub}>{subtitle}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: Colors.card, true: Colors.teal }}
          thumbColor={Colors.white}
        />
      </View>
    </Animated.View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, delay = 0 }: { title: string; subtitle?: string; delay?: number }) {
  return (
    <Animated.View entering={FadeIn.delay(delay)} style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLine} />
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <View style={styles.sectionHeaderLine} />
    </Animated.View>
  );
}

// ─── Custom Color Row ─────────────────────────────────────────────────────────

function ColorRow({
  field,
  value,
  onChangeText,
  onEndEditing,
}: {
  field: { key: keyof ThemeCustomColors; labelKey: string };
  value: string;
  onChangeText: (v: string) => void;
  onEndEditing: (v: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.colorRow}>
      <View style={[styles.colorDot, { backgroundColor: value }]} />
      <Text style={styles.colorLabel}>{t(field.labelKey)}</Text>
      <View style={styles.hexInputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onEndEditing={(e) => onEndEditing(e.nativeEvent.text)}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.hexInput}
          placeholder="#000000"
          placeholderTextColor={Colors.muted2}
        />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();

  const activePreset = (settings.themePreset ?? 'default') as ThemePreset;
  const mergedCustomColors = useMemo<ThemeCustomColors>(
    () => ({ ...DEFAULT_THEME_CUSTOM_COLORS, ...(settings.customThemeColors ?? {}) }),
    [settings.customThemeColors]
  );

  const [customColorsDraft, setCustomColorsDraft] = useState<ThemeCustomColors>(mergedCustomColors);
  const [customExpanded, setCustomExpanded] = useState(false);

  useEffect(() => {
    setCustomColorsDraft(mergedCustomColors);
  }, [mergedCustomColors]);

  const applyWithSettings = (partial: Partial<typeof settings>) => {
    updateSettings(partial);
    applyThemeFromUserSettings({ ...settings, ...partial });
  };

  const applyPreset = (preset: Exclude<ThemePreset, 'custom'>) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    applyWithSettings({ themePreset: preset });
    reloadIfNeeded();
  };

  const normalizeCustomField = (field: keyof ThemeCustomColors, value: string) => {
    const normalized = normalizeThemeHexColor(value);
    if (!normalized) {
      Alert.alert(
        t('settings.appearanceInvalidColorTitle'),
        t('settings.appearanceInvalidColorMessage')
      );
      return;
    }
    setCustomColorsDraft((prev) => ({ ...prev, [field]: normalized }));
  };

  const applyCustomTheme = () => {
    const normalized = { ...customColorsDraft };
    for (const field of CUSTOM_FIELDS) {
      const parsed = normalizeThemeHexColor(normalized[field.key]);
      if (!parsed) {
        Alert.alert(
          t('settings.appearanceInvalidColorTitle'),
          t('settings.appearanceInvalidColorMessage')
        );
        return;
      }
      normalized[field.key] = parsed;
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCustomColorsDraft(normalized);
    applyWithSettings({ themePreset: 'custom', customThemeColors: normalized });
    reloadIfNeeded();
  };

  const resetCustomTheme = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCustomColorsDraft(DEFAULT_THEME_CUSTOM_COLORS);
    applyWithSettings({ themePreset: 'default', customThemeColors: DEFAULT_THEME_CUSTOM_COLORS });
    reloadIfNeeded();
  };

  const reloadIfNeeded = () => {
    if (__DEV__) {
      DevSettings.reload();
      return;
    }
    Alert.alert(
      t('settings.appearanceRestartTitle'),
      t('settings.appearanceRestartMessage')
    );
  };

  // Group CUSTOM_FIELDS by group
  const groupedFields = useMemo(() => {
    const groups: Record<string, typeof CUSTOM_FIELDS> = {};
    for (const f of CUSTOM_FIELDS) {
      if (!groups[f.groupKey]) groups[f.groupKey] = [];
      groups[f.groupKey].push(f);
    }
    return groups;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Ambient glows */}
      <LinearGradient
        colors={[Colors.overlayViolet24, Colors.transparent]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[Colors.transparent, Colors.overlayModal95]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomGlow}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.delay(30)} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.eyebrow}>{t('settings.eyebrow')}</Text>
            <Text style={styles.screenTitle}>{t('settings.appearance')}</Text>
          </View>
          <View style={styles.headerIcon}>
            <Palette size={16} color={Colors.violet} />
          </View>
        </Animated.View>

        {/* ── Interface toggles ── */}
        <Animated.View entering={FadeInDown.delay(80)} style={styles.card}>
          <LinearGradient colors={['#1c1c2e', '#14141f']} style={StyleSheet.absoluteFill} />
          <ToggleRow
            icon={<Eye size={18} color={Colors.violet} />}
            iconColor={Colors.violet}
            title={t('settings.fullOpacityNavbar')}
            subtitle={t('settings.fullOpacityNavbarDesc')}
            value={settings.fullOpacityNavbar ?? false}
            onValueChange={(v) => updateSettings({ fullOpacityNavbar: v })}
            delay={90}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<Trophy size={18} color={Colors.goldStrong} />}
            iconColor={Colors.goldStrong}
            title={t('settings.showGamificationTab')}
            subtitle={t('settings.showGamificationTabDesc')}
            value={!(settings.hiddenTabs?.gamification ?? false)}
            onValueChange={(v) =>
              updateSettings({ hiddenTabs: { ...settings.hiddenTabs, gamification: !v } })
            }
            delay={110}
          />
        </Animated.View>

        {/* ── Theme presets ── */}
        <SectionHeader
          title={t('settings.appearancePresetsTitle')}
          delay={150}
        />

        {/* Grid of theme cards */}
        <Animated.View entering={FadeIn.delay(160)} style={styles.themeGrid}>
          {THEME_CARDS.map((theme, i) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={activePreset === theme.id}
              onPress={() => applyPreset(theme.id)}
              delay={170 + i * 40}
            />
          ))}

          {/* Custom card */}
          <Animated.View entering={FadeInDown.delay(380)} style={styles.themeCardWrapper}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setCustomExpanded((v) => !v);
              }}
              style={styles.themeCardPressable}
            >
              <View style={[styles.themeCard, styles.customThemeCard]}>
                <LinearGradient
                  colors={['#1a0a2e', '#2d1060', '#1a0a2e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {activePreset === 'custom' && (
                  <Animated.View entering={ZoomIn} style={[styles.checkBadge, { backgroundColor: '#9b59b6' }]}>
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </Animated.View>
                )}
                <View style={styles.themeCardInner}>
                  <Text style={[styles.themeEmoji, { color: '#c084fc' }]}>✦✦</Text>
                  <View style={styles.themeSwatches}>
                    {['#f472b6', '#c084fc', '#818cf8'].map((c, i) => (
                      <View key={`${c}-${i}`} style={[styles.themeSwatchDot, { backgroundColor: c }]} />
                    ))}
                  </View>
                  <Text style={styles.themeCardLabel}>{t('settings.appearanceCustomCardLabel')}</Text>
                  <Text style={styles.themeCardDesc}>{t('settings.appearanceCustomCardDesc')}</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ── Custom theme editor (collapsible) ── */}
        {customExpanded && (
          <Animated.View entering={FadeInDown
} style={styles.customEditorCard}>
            <LinearGradient colors={['#12101e', '#0e0c18']} style={StyleSheet.absoluteFill} />

            <View style={styles.customEditorHeader}>
              <Sparkles size={14} color="#c084fc" />
              <Text style={styles.customEditorTitle}>
                {t('settings.appearanceCustomTitle')}
              </Text>
            </View>
            <Text style={styles.customEditorSub}>
              {t('settings.appearanceCustomSubtitle')}
            </Text>

            {/* Color groups */}
            {Object.entries(groupedFields).map(([groupKey, fields]) => (
              <View key={groupKey} style={styles.colorGroup}>
                <Text style={styles.colorGroupLabel}>{t(groupKey)}</Text>
                {fields.map((field) => (
                  <ColorRow
                    key={field.key}
                    field={field}
                    value={customColorsDraft[field.key]}
                    onChangeText={(v) => setCustomColorsDraft((prev) => ({ ...prev, [field.key]: v }))}
                    onEndEditing={(v) => normalizeCustomField(field.key, v)}
                  />
                ))}
              </View>
            ))}

            {/* Actions */}
            <View style={styles.customActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={resetCustomTheme}>
                <RotateCcw size={14} color={Colors.muted} />
                <Text style={styles.btnSecondaryText}>
                  {t('settings.appearanceResetDefault')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={applyCustomTheme}>
                <Check size={14} color="#fff" strokeWidth={2.5} />
                <Text style={styles.btnPrimaryText}>
                  {t('settings.appearanceApplyCustomTheme')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300, zIndex: 0,
  },
  bottomGlow: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, zIndex: 0,
  },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: Colors.overlay,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.stroke,
  },
  headerCenter: { flex: 1 },
  eyebrow: {
    fontSize: 9, color: Colors.muted,
    letterSpacing: 3, textTransform: 'uppercase', fontWeight: '900',
  },
  screenTitle: {
    fontSize: 26, fontWeight: FontWeight.bold, color: Colors.text, letterSpacing: -0.8,
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: Colors.overlayViolet35,
    backgroundColor: Colors.overlayViolet14,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Toggle card
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.overlayWhite10,
    marginBottom: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12, gap: 12,
  },
  toggleIcon: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  toggleInfo: { flex: 1 },
  toggleTitle: {
    fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text,
  },
  toggleSub: {
    fontSize: FontSize.xs, color: Colors.muted, marginTop: 2,
  },
  divider: {
    height: 1, backgroundColor: Colors.overlayWhite10,
    marginHorizontal: 12,
  },

  // ── Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 14,
  },
  sectionHeaderLine: {
    flex: 1, height: 1, backgroundColor: Colors.overlayWhite10,
  },
  sectionHeaderTitle: {
    fontSize: 9, fontWeight: '900',
    color: Colors.muted, letterSpacing: 2.5, textTransform: 'uppercase',
  },

  // ── Theme grid
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  themeCardWrapper: {
    width: '47%',
  },
  themeCardPressable: {
    borderRadius: 18,
  },
  themeCard: {
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  themeCardBorder: {
    borderRadius: 18,
    borderWidth: 1,
  },
  customThemeCard: {
    borderWidth: 1,
    borderColor: '#c084fc30',
  },
  themeCardInner: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
    position: 'relative',
    zIndex: 2,
  },
  blob: {
    position: 'absolute',
    width: 60, height: 60,
    borderRadius: 30,
    opacity: 0.25,
    zIndex: 0,
  },
  blob2: {
    position: 'absolute',
    width: 40, height: 40,
    borderRadius: 20,
    opacity: 0.15,
    zIndex: 0,
  },
  themeEmoji: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    zIndex: 2,
  },
  themeSwatches: {
    flexDirection: 'row', gap: 4, marginBottom: 8, zIndex: 2,
  },
  themeSwatchDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1, borderColor: '#ffffff20',
  },
  themeCardLabel: {
    color: '#fff', fontSize: 14, fontWeight: '800',
    letterSpacing: -0.3, zIndex: 2,
  },
  themeCardDesc: {
    color: '#ffffff60', fontSize: 10, fontWeight: '600',
    marginTop: 1, zIndex: 2,
  },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },

  // ── Custom editor
  customEditorCard: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#c084fc22',
    padding: 16, marginTop: 8, marginBottom: 8,
  },
  customEditorHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4,
  },
  customEditorTitle: {
    fontSize: 15, fontWeight: '800', color: Colors.text,
  },
  customEditorSub: {
    fontSize: 11, color: Colors.muted, lineHeight: 16, marginBottom: 16,
  },

  // Color groups
  colorGroup: {
    marginBottom: 14,
  },
  colorGroupLabel: {
    fontSize: 9, fontWeight: '900', color: Colors.muted,
    letterSpacing: 2.5, textTransform: 'uppercase',
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, gap: 10,
  },
  colorDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.overlayWhite30,
    flexShrink: 0,
  },
  colorLabel: {
    flex: 1, color: Colors.text,
    fontSize: FontSize.sm, fontWeight: FontWeight.medium,
  },
  hexInputWrap: {
    borderWidth: 1, borderColor: Colors.stroke,
    borderRadius: 10, overflow: 'hidden',
  },
  hexInput: {
    width: 104,
    paddingVertical: 7, paddingHorizontal: 10,
    color: Colors.text, fontSize: 12,
    fontWeight: '700',
    backgroundColor: Colors.overlay,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Actions
  customActions: {
    flexDirection: 'row', gap: 10, marginTop: 12,
  },
  btnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.stroke,
    paddingVertical: 12, backgroundColor: Colors.overlay,
  },
  btnSecondaryText: {
    color: Colors.muted, fontSize: 12, fontWeight: '600',
  },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 12,
    backgroundColor: Colors.cta,
  },
  btnPrimaryText: {
    color: Colors.bg, fontSize: 13, fontWeight: '800',
  },
});