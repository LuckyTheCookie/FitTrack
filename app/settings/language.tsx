// ============================================================================
// SETTINGS - LANGUAGE SUB-SCREEN
// ============================================================================

import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'lucide-react-native';
import { GlassCard } from '../../src/components/ui';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';
import { LANGUAGES, changeLanguage, getCurrentLanguage, type LanguageCode } from '../../src/i18n';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(getCurrentLanguage());

  const handleLanguageChange = useCallback(async (lang: LanguageCode) => {
    await changeLanguage(lang);
    setCurrentLanguage(lang);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(50)} style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('settings.language')}</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Language Options */}
        <GlassCard style={styles.languageCard}>
          {(Object.entries(LANGUAGES) as [LanguageCode, typeof LANGUAGES[LanguageCode]][]).map(([code, lang], index) => (
            <Animated.View 
              key={code}
              entering={FadeInDown.delay(100 + index * 50).springify()}
            >
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  currentLanguage === code && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageChange(code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageName,
                  currentLanguage === code && styles.languageNameActive,
                ]}>
                  {lang.nativeName}
                </Text>
                {currentLanguage === code && (
                  <View style={styles.languageCheck}>
                    <Check size={16} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
              {index < Object.keys(LANGUAGES).length - 1 && (
                <View style={styles.divider} />
              )}
            </Animated.View>
          ))}
        </GlassCard>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  headerSpacer: {
    width: 44,
  },

  // Language Card
  languageCard: {
    paddingVertical: Spacing.xs,
  },

  // Language Option
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  languageOptionActive: {
    backgroundColor: `${Colors.teal}15`,
  },
  languageFlag: {
    fontSize: 28,
  },
  languageName: {
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
  },
  languageNameActive: {
    fontWeight: FontWeight.bold,
    color: Colors.teal,
  },
  languageCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.stroke,
    marginHorizontal: Spacing.md,
  },
});
