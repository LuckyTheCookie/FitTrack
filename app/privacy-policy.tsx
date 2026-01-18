// ============================================================================
// PRIVACY POLICY SCREEN - Politique de confidentialité RGPD
// ============================================================================

import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Shield, Lock, Server, Bell, Trash2, Heart, Leaf, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../src/components/ui';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { BuildConfig } from '../src/config';

// Section component for organizing content
function PolicySection({ 
    title, 
    icon, 
    iconColor, 
    children, 
    delay = 0 
}: { 
    title: string; 
    icon: React.ReactNode; 
    iconColor: string;
    children: React.ReactNode; 
    delay?: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()}>
            <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                        {icon}
                    </View>
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
                <View style={styles.sectionContent}>
                    {children}
                </View>
            </GlassCard>
        </Animated.View>
    );
}

function BulletPoint({ children }: { children: React.ReactNode }) {
    return (
        <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );
}

export default function PrivacyPolicyScreen() {
    const { t } = useTranslation();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <Animated.View entering={FadeIn} style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ArrowLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('privacyPolicy.title')}</Text>
                <View style={styles.headerIcon}>
                    <Shield size={24} color={Colors.cta} />
                </View>
            </Animated.View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Introduction */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={styles.intro}>{t('privacyPolicy.intro')}</Text>
                    <Text style={styles.lastUpdate}>{t('privacyPolicy.lastUpdate')}</Text>
                </Animated.View> 

                {/* Mode Local */}
                <PolicySection 
                    title={t('privacyPolicy.localMode.title')} 
                    icon={<Lock size={20} color="#4ade80" />}
                    iconColor="#4ade80"
                    delay={200}
                >
                    <Text style={styles.paragraph}>{t('privacyPolicy.localMode.description')}</Text>
                    <Text style={styles.subheading}>{t('privacyPolicy.localMode.storedDataTitle' , { defaultValue: 'Données stockées localement :' })}</Text>
                    <BulletPoint>{t('privacyPolicy.localMode.storedData.sessions')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.localMode.storedData.runs')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.localMode.storedData.meals')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.localMode.storedData.measures')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.localMode.storedData.settings')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.localMode.storedData.badges')}</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.highlight]}>
                        {t('privacyPolicy.localMode.highlight')}
                    </Text>
                </PolicySection>

                {/* FOSS Edition Notice */}
                {BuildConfig.isFoss && (
                    <PolicySection 
                        title={t('privacyPolicy.foss.title')} 
                        icon={<Leaf size={20} color="#4ade80" />}
                        iconColor="#4ade80"
                        delay={250}
                    >
                        <Text style={styles.paragraph}>{t('privacyPolicy.foss.description')}</Text>
                        <Text style={styles.subheading}>{t('privacyPolicy.foss.removedTitle', { defaultValue: 'Ce qui a été retiré :' })}</Text>
                        <BulletPoint>{t('privacyPolicy.foss.removed.fcm')}</BulletPoint>
                        <BulletPoint>{t('privacyPolicy.foss.removed.google')}</BulletPoint>
                        <BulletPoint>{t('privacyPolicy.foss.removed.expoPush')}</BulletPoint>
                        
                        <Text style={styles.subheading}>{t('privacyPolicy.foss.stillWorkingTitle', { defaultValue: 'Ce qui fonctionne toujours :' })}</Text>
                        <BulletPoint>{t('privacyPolicy.foss.stillWorking.localFeatures')}</BulletPoint>
                        <BulletPoint>{t('privacyPolicy.foss.stillWorking.social')}</BulletPoint>
                        <BulletPoint>{t('privacyPolicy.foss.stillWorking.localNotifications')}</BulletPoint>
                        <BulletPoint>{t('privacyPolicy.foss.stillWorking.supabaseSync')}</BulletPoint>
                        
                        <Text style={[styles.paragraph, styles.highlight]}>
                            {t('privacyPolicy.foss.note')}
                        </Text>
                    </PolicySection>
                )} 

                {/* Mode Social */}
                <PolicySection 
                    title={t('privacyPolicy.social.title')} 
                    icon={<Server size={20} color="#22d3ee" />}
                    iconColor="#22d3ee"
                    delay={300}
                >
                    <Text style={styles.paragraph}>{t('privacyPolicy.social.description')}</Text>
                    
                    <Text style={styles.subheading}>{t('privacyPolicy.social.syncedDataTitle', { defaultValue: 'Données synchronisées :' })}</Text>
                    <BulletPoint>{t('privacyPolicy.social.syncedData.nickname')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.social.syncedData.xp')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.social.syncedData.streak')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.social.syncedData.weeklyCount')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.social.syncedData.weeklyTotals')}</BulletPoint>
                    
                    <Text style={styles.subheading}>{t('privacyPolicy.social.accountDataTitle', { defaultValue: 'Données de compte :' })}</Text>
                    <BulletPoint>{t('privacyPolicy.social.accountData.email')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.social.accountData.password')}</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.warning]}>
                        {t('privacyPolicy.social.warning')}
                    </Text>
                </PolicySection> 

                {/* Notifications */}
                <PolicySection 
                    title={t('privacyPolicy.notifications.title')} 
                    icon={<Bell size={20} color="#fbbf24" />}
                    iconColor="#fbbf24"
                    delay={400}
                >
                    {BuildConfig.isFoss ? (
                        <>
                            <Text style={[styles.paragraph, styles.highlight]}>
                                {t('privacyPolicy.notifications.fossNote')}
                            </Text>
                            <Text style={styles.paragraph}>
                                {t('privacyPolicy.notifications.fossText')}
                            </Text>
                            <Text style={styles.paragraph}>
                                {t('privacyPolicy.notifications.fossInstall')}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.paragraph}>
                                {t('privacyPolicy.notifications.standardText')}
                            </Text>
                            <BulletPoint>{t('privacyPolicy.notifications.items.streakReminders')}</BulletPoint>
                            <BulletPoint>{t('privacyPolicy.notifications.items.encouragements')}</BulletPoint>
                            <BulletPoint>{t('privacyPolicy.notifications.items.friendRequests')}</BulletPoint>
                            
                            <Text style={styles.subheading}>{t('privacyPolicy.notifications.technologiesTitle', { defaultValue: 'Technologies utilisées :' })}</Text>
                            <BulletPoint>{t('privacyPolicy.notifications.technologies.expo')}</BulletPoint>
                            <BulletPoint>{t('privacyPolicy.notifications.technologies.fcm')}</BulletPoint>
                            
                            <Text style={styles.paragraph}>
                                {t('privacyPolicy.notifications.disable')}
                            </Text>
                        </>
                    )}
                </PolicySection> 

                {/* Health Connect */}
                <PolicySection 
                    title={t('privacyPolicy.healthConnect.title')} 
                    icon={<Heart size={20} color="#f43f5e" />}
                    iconColor="#f43f5e"
                    delay={450}
                >
                    <Text style={styles.paragraph}>{t('privacyPolicy.healthConnect.description')}</Text>
                    
                    <Text style={styles.subheading}>{t('privacyPolicy.healthConnect.dataTitle', { defaultValue: 'Données accessibles :' })}</Text>
                    <BulletPoint>{t('privacyPolicy.healthConnect.data.sessions')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.healthConnect.data.distance')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.healthConnect.data.calories')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.healthConnect.data.hr')}</BulletPoint>
                    
                    <Text style={styles.subheading}>{t('privacyPolicy.healthConnect.usageTitle', { defaultValue: 'Utilisation des données :' })}</Text>
                    <BulletPoint>{t('privacyPolicy.healthConnect.usage.localImport')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.healthConnect.usage.convert')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.healthConnect.usage.choose')}</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.highlight]}>
                        {t('privacyPolicy.healthConnect.highlight')}
                    </Text>
                    
                    <Text style={styles.paragraph}>
                        {t('privacyPolicy.healthConnect.revoke')}
                    </Text>
                </PolicySection> 

                {/* Tes droits RGPD */}
                <PolicySection 
                    title={t('privacyPolicy.rights.title')} 
                    icon={<Trash2 size={20} color="#f87171" />}
                    iconColor="#f87171"
                    delay={550}
                >
                    <Text style={styles.paragraph}>{t('privacyPolicy.rights.description')}</Text>
                    <BulletPoint>{t('privacyPolicy.rights.access')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.rights.rectification')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.rights.deletion')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.rights.portability')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.rights.opposition')}</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.highlight]}>
                        {t('privacyPolicy.rights.highlight')}
                    </Text>
                </PolicySection> 

                {/* Pollination AI Section */}
                <PolicySection 
                    title={t('privacyPolicy.pollination.title')} 
                    icon={<Sparkles size={20} color="#8B5CF6" />}
                    iconColor="#8B5CF6"
                    delay={600}
                >
                    <Text style={styles.paragraph}>{t('privacyPolicy.pollination.description')}</Text>
                    
                    <Text style={styles.subheading}>{t('privacyPolicy.pollination.dataTitle')}</Text>
                    <BulletPoint>{t('privacyPolicy.pollination.data.images')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.pollination.data.temporary')}</BulletPoint>
                    <BulletPoint>{t('privacyPolicy.pollination.data.apiKey')}</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.warning]}>
                        {t('privacyPolicy.pollination.warning')}
                    </Text>
                    
                    <Text style={styles.paragraph}>{t('privacyPolicy.pollination.optOut')}</Text>
                </PolicySection>

                {/* Contact */}
                <Animated.View entering={FadeInDown.delay(700).springify()}>
                    <GlassCard style={styles.contactCard}>
                        <Text style={styles.contactTitle}>{t('privacyPolicy.contact.title')}</Text>
                        <Text style={styles.contactText}>{t('privacyPolicy.contact.text')}</Text>
                    </GlassCard>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        flex: 1,
        textAlign: 'center',
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    intro: {
        fontSize: FontSize.md,
        color: Colors.muted,
        lineHeight: 24,
        marginBottom: Spacing.sm,
    },
    lastUpdate: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        marginBottom: Spacing.lg,
    },
    section: {
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    sectionContent: {
        gap: Spacing.sm,
    },
    paragraph: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        lineHeight: 22,
    },
    subheading: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    bulletRow: {
        flexDirection: 'row',
        paddingLeft: Spacing.sm,
    },
    bullet: {
        fontSize: FontSize.sm,
        color: Colors.cta,
        marginRight: Spacing.sm,
        lineHeight: 22,
    },
    bulletText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        flex: 1,
        lineHeight: 22,
    },
    highlight: {
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    warning: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    bold: {
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    contactCard: {
        padding: Spacing.lg,
        alignItems: 'center',
    },
    contactTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    contactText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 22,
    },
});
