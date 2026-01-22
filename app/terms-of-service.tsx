// ============================================================================
// TERMS OF SERVICE SCREEN - Conditions d'utilisation
// ============================================================================

import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { 
    ArrowLeft, 
    FileText, 
    CheckCircle, 
    AlertTriangle,
    Smartphone,
    Users,
    Sparkles,
    Scale,
    Code,
    ExternalLink,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../src/components/ui';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { BuildConfig } from '../src/config';

// Section component
function TermsSection({ 
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

function BulletPoint({ children, type = 'default' }: { children: React.ReactNode; type?: 'default' | 'allowed' | 'forbidden' }) {
    const colors = {
        default: Colors.cta,
        allowed: '#4ade80',
        forbidden: '#f87171',
    };
    const icons = {
        default: '•',
        allowed: '✓',
        forbidden: '✗',
    };
    
    return (
        <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: colors[type] }]}>{icons[type]}</Text>
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );
}

export default function TermsOfServiceScreen() {
    const { t } = useTranslation();

    const openLicense = () => {
        Linking.openURL('https://github.com/LuckyTheCookie/FitTrack/blob/main/LICENSE.md');
    };

    const openSourceCode = () => {
        Linking.openURL('https://github.com/LuckyTheCookie/FitTrack');
    };

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
                <Text style={styles.title}>{t('termsOfService.title')}</Text>
                <View style={styles.headerIcon}>
                    <FileText size={24} color={Colors.cta} />
                </View>
            </Animated.View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Introduction */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={styles.intro}>{t('termsOfService.intro')}</Text>
                    <Text style={styles.lastUpdate}>{t('termsOfService.lastUpdate')}</Text>
                </Animated.View>

                {/* License & Open Source */}
                <TermsSection 
                    title={t('termsOfService.license.title')} 
                    icon={<Code size={20} color="#a78bfa" />}
                    iconColor="#a78bfa"
                    delay={150}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.license.description')}</Text>
                    
                    <Text style={styles.subheading}>{t('termsOfService.license.rightsTitle')}</Text>
                    <BulletPoint type="allowed">{t('termsOfService.license.rights.use')}</BulletPoint>
                    <BulletPoint type="allowed">{t('termsOfService.license.rights.modify')}</BulletPoint>
                    <BulletPoint type="allowed">{t('termsOfService.license.rights.distribute')}</BulletPoint>
                    <BulletPoint type="allowed">{t('termsOfService.license.rights.commercial')}</BulletPoint>
                    
                    <Text style={styles.subheading}>{t('termsOfService.license.obligationsTitle')}</Text>
                    <BulletPoint>{t('termsOfService.license.obligations.sameTerms')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.license.obligations.sourceCode')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.license.obligations.copyright')}</BulletPoint>
                    
                    <View style={styles.linkRow}>
                        <TouchableOpacity style={styles.linkButton} onPress={openLicense}>
                            <ExternalLink size={14} color={Colors.cta} />
                            <Text style={styles.linkText}>{t('termsOfService.license.viewLicense')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.linkButton} onPress={openSourceCode}>
                            <Code size={14} color={Colors.cta} />
                            <Text style={styles.linkText}>{t('termsOfService.license.viewSource')}</Text>
                        </TouchableOpacity>
                    </View>
                </TermsSection>

                {/* Nature of the App */}
                <TermsSection 
                    title={t('termsOfService.appNature.title')} 
                    icon={<Smartphone size={20} color="#4ade80" />}
                    iconColor="#4ade80"
                    delay={200}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.appNature.description')}</Text>
                    
                    <BulletPoint>{t('termsOfService.appNature.features.tracking')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.appNature.features.gamification')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.appNature.features.social')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.appNature.features.ai')}</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.warning]}>
                        {t('termsOfService.appNature.medicalDisclaimer')}
                    </Text>
                </TermsSection>

                {/* App Versions */}
                <TermsSection 
                    title={t('termsOfService.versions.title')} 
                    icon={<Smartphone size={20} color="#22d3ee" />}
                    iconColor="#22d3ee"
                    delay={250}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.versions.description')}</Text>
                    
                    <Text style={styles.subheading}>{t('termsOfService.versions.standard.title')}</Text>
                    <BulletPoint>{t('termsOfService.versions.standard.push')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.versions.standard.ploppy')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.versions.standard.social')}</BulletPoint>
                    
                    <Text style={styles.subheading}>{t('termsOfService.versions.foss.title')}</Text>
                    <BulletPoint>{t('termsOfService.versions.foss.noCloud')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.versions.foss.noPush')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.versions.foss.fullLocal')}</BulletPoint>

                    {BuildConfig.isFoss && (
                        <Text style={[styles.paragraph, styles.highlight]}>
                            {t('termsOfService.versions.currentFoss')}
                        </Text>
                    )}
                </TermsSection>

                {/* Optional Services */}
                <TermsSection 
                    title={t('termsOfService.optionalServices.title')} 
                    icon={<Sparkles size={20} color="#fbbf24" />}
                    iconColor="#fbbf24"
                    delay={300}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.optionalServices.description')}</Text>
                    
                    <Text style={styles.subheading}>{t('termsOfService.optionalServices.ploppy.title')}</Text>
                    <BulletPoint>{t('termsOfService.optionalServices.ploppy.account')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.optionalServices.ploppy.photos')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.optionalServices.ploppy.disable')}</BulletPoint>
                    
                    <Text style={styles.subheading}>{t('termsOfService.optionalServices.social.title')}</Text>
                    <BulletPoint>{t('termsOfService.optionalServices.social.account')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.optionalServices.social.rules')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.optionalServices.social.delete')}</BulletPoint>
                </TermsSection>

                {/* Social Features */}
                <TermsSection 
                    title={t('termsOfService.socialRules.title')} 
                    icon={<Users size={20} color="#22d3ee" />}
                    iconColor="#22d3ee"
                    delay={350}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.socialRules.description')}</Text>
                    
                    <Text style={styles.subheading}>{t('termsOfService.socialRules.rulesTitle')}</Text>
                    <BulletPoint type="allowed">{t('termsOfService.socialRules.allowed.respect')}</BulletPoint>
                    <BulletPoint type="allowed">{t('termsOfService.socialRules.allowed.appropriate')}</BulletPoint>
                    <BulletPoint type="allowed">{t('termsOfService.socialRules.allowed.positive')}</BulletPoint>
                    
                    <BulletPoint type="forbidden">{t('termsOfService.socialRules.forbidden.spam')}</BulletPoint>
                    <BulletPoint type="forbidden">{t('termsOfService.socialRules.forbidden.impersonate')}</BulletPoint>
                    <BulletPoint type="forbidden">{t('termsOfService.socialRules.forbidden.offensive')}</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.warning]}>
                        {t('termsOfService.socialRules.warning')}
                    </Text>
                </TermsSection>

                {/* Liability */}
                <TermsSection 
                    title={t('termsOfService.liability.title')} 
                    icon={<AlertTriangle size={20} color="#f87171" />}
                    iconColor="#f87171"
                    delay={400}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.liability.description')}</Text>
                    <BulletPoint>{t('termsOfService.liability.items.medical')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.liability.items.injury')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.liability.items.accuracy')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.liability.items.dataLoss')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.liability.items.thirdParty')}</BulletPoint>
                </TermsSection>

                {/* Jurisdiction */}
                <TermsSection 
                    title={t('termsOfService.jurisdiction.title')} 
                    icon={<Scale size={20} color="#a78bfa" />}
                    iconColor="#a78bfa"
                    delay={450}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.jurisdiction.description')}</Text>
                    <BulletPoint>{t('termsOfService.jurisdiction.items.french')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.jurisdiction.items.gdpr')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.jurisdiction.items.disputes')}</BulletPoint>
                </TermsSection>

                {/* Modifications */}
                <TermsSection 
                    title={t('termsOfService.modifications.title')} 
                    icon={<FileText size={20} color="#fbbf24" />}
                    iconColor="#fbbf24"
                    delay={500}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.modifications.description')}</Text>
                    <Text style={styles.paragraph}>{t('termsOfService.modifications.continued')}</Text>
                </TermsSection>

                {/* Termination */}
                <TermsSection 
                    title={t('termsOfService.termination.title')} 
                    icon={<AlertTriangle size={20} color="#f87171" />}
                    iconColor="#f87171"
                    delay={550}
                >
                    <Text style={styles.paragraph}>{t('termsOfService.termination.description')}</Text>
                    <BulletPoint>{t('termsOfService.termination.items.stop')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.termination.items.delete')}</BulletPoint>
                    <BulletPoint>{t('termsOfService.termination.items.export')}</BulletPoint>
                </TermsSection>

                {/* Acceptance */}
                <Animated.View entering={FadeInDown.delay(600).springify()}>
                    <GlassCard style={styles.acceptCard}>
                        <CheckCircle size={32} color="#4ade80" />
                        <Text style={styles.acceptTitle}>{t('termsOfService.acceptance.title')}</Text>
                        <Text style={styles.acceptText}>{t('termsOfService.acceptance.text')}</Text>
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
        flex: 1,
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
        marginRight: Spacing.sm,
        lineHeight: 22,
        fontWeight: FontWeight.bold,
    },
    bulletText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        flex: 1,
        lineHeight: 22,
    },
    warning: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    highlight: {
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    linkRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: 'rgba(215, 150, 134, 0.1)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    linkText: {
        fontSize: FontSize.sm,
        color: Colors.cta,
        fontWeight: FontWeight.medium,
    },
    acceptCard: {
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    acceptTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    acceptText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 22,
    },
});
