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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { 
    ArrowLeft, 
    FileText, 
    CheckCircle, 
    XCircle, 
    AlertTriangle,
    Smartphone,
    Users,
    Sparkles,
} from 'lucide-react-native';
import { GlassCard } from '../src/components/ui';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';

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
                <Text style={styles.title}>Conditions d'Utilisation</Text>
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
                    <Text style={styles.intro}>
                        En utilisant FitTrack, tu acceptes les conditions suivantes. 
                        Nous te recommandons de les lire attentivement.
                    </Text>
                    <Text style={styles.lastUpdate}>
                        Dernière mise à jour : 1er janvier 2026
                    </Text>
                </Animated.View>

                {/* Utilisation de l'app */}
                <TermsSection 
                    title="Utilisation de l'Application" 
                    icon={<Smartphone size={20} color="#4ade80" />}
                    iconColor="#4ade80"
                    delay={200}
                >
                    <Text style={styles.paragraph}>
                        FitTrack est une application gratuite de suivi fitness conçue pour 
                        t'aider à atteindre tes objectifs sportifs.
                    </Text>
                    
                    <Text style={styles.subheading}>Tu peux :</Text>
                    <BulletPoint type="allowed">Utiliser l'app pour ton usage personnel</BulletPoint>
                    <BulletPoint type="allowed">Créer un compte pour les fonctionnalités sociales</BulletPoint>
                    <BulletPoint type="allowed">Exporter et supprimer tes données à tout moment</BulletPoint>
                    <BulletPoint type="allowed">Partager l'app avec tes amis</BulletPoint>
                    
                    <Text style={styles.subheading}>Tu ne peux pas :</Text>
                    <BulletPoint type="forbidden">Utiliser l'app à des fins commerciales non autorisées</BulletPoint>
                    <BulletPoint type="forbidden">Tenter de pirater ou modifier l'application</BulletPoint>
                    <BulletPoint type="forbidden">Créer de faux comptes ou usurper des identités</BulletPoint>
                    <BulletPoint type="forbidden">Publier du contenu offensant via les fonctionnalités sociales</BulletPoint>
                </TermsSection>

                {/* Fonctionnalités sociales */}
                <TermsSection 
                    title="Fonctionnalités Sociales" 
                    icon={<Users size={20} color="#22d3ee" />}
                    iconColor="#22d3ee"
                    delay={300}
                >
                    <Text style={styles.paragraph}>
                        Les fonctionnalités sociales (classement, amis, encouragements) sont 
                        optionnelles et nécessitent la création d'un compte.
                    </Text>
                    
                    <Text style={styles.subheading}>Règles de la communauté :</Text>
                    <BulletPoint>Respecte les autres utilisateurs</BulletPoint>
                    <BulletPoint>Choisis un pseudo approprié</BulletPoint>
                    <BulletPoint>N'envoie que des encouragements positifs</BulletPoint>
                    <BulletPoint>Signale tout comportement inapproprié</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.warning]}>
                        ⚠️ Nous nous réservons le droit de supprimer tout compte qui viole 
                        ces règles sans préavis.
                    </Text>
                </TermsSection>

                {/* Gamification */}
                <TermsSection 
                    title="Système de Gamification" 
                    icon={<Sparkles size={20} color="#fbbf24" />}
                    iconColor="#fbbf24"
                    delay={400}
                >
                    <Text style={styles.paragraph}>
                        L'XP, les niveaux, les badges et les streaks sont des éléments de 
                        motivation sans valeur monétaire.
                    </Text>
                    <BulletPoint>L'XP et le niveau reflètent ton activité</BulletPoint>
                    <BulletPoint>Les badges récompensent tes accomplissements</BulletPoint>
                    <BulletPoint>Le classement est basé sur l'XP hebdomadaire</BulletPoint>
                    <BulletPoint>Aucun élément n'est monnayable ou échangeable</BulletPoint>
                </TermsSection>

                {/* Responsabilité */}
                <TermsSection 
                    title="Limitation de Responsabilité" 
                    icon={<AlertTriangle size={20} color="#f87171" />}
                    iconColor="#f87171"
                    delay={500}
                >
                    <Text style={styles.paragraph}>
                        FitTrack est fourni "tel quel" sans garantie d'aucune sorte.
                    </Text>
                    <BulletPoint>
                        L'app n'est pas un conseil médical - consulte un professionnel de 
                        santé avant de commencer un programme sportif
                    </BulletPoint>
                    <BulletPoint>
                        Nous ne sommes pas responsables des blessures liées à l'exercice physique
                    </BulletPoint>
                    <BulletPoint>
                        La détection de mouvement (accéléromètre/caméra) peut ne pas être 
                        parfaitement précise
                    </BulletPoint>
                    <BulletPoint>
                        En cas de perte de données, nous ne pouvons pas les récupérer 
                        (pense à exporter régulièrement)
                    </BulletPoint>
                </TermsSection>

                {/* Modifications */}
                <TermsSection 
                    title="Modifications des Conditions" 
                    icon={<FileText size={20} color="#a78bfa" />}
                    iconColor="#a78bfa"
                    delay={600}
                >
                    <Text style={styles.paragraph}>
                        Nous pouvons modifier ces conditions à tout moment. Les changements 
                        importants seront notifiés dans l'application.
                    </Text>
                    <Text style={styles.paragraph}>
                        En continuant à utiliser FitTrack après une modification, tu acceptes 
                        les nouvelles conditions.
                    </Text>
                </TermsSection>

                {/* Acceptation */}
                <Animated.View entering={FadeInDown.delay(700).springify()}>
                    <GlassCard style={styles.acceptCard}>
                        <CheckCircle size={32} color="#4ade80" />
                        <Text style={styles.acceptTitle}>Utilisation de FitTrack</Text>
                        <Text style={styles.acceptText}>
                            En utilisant cette application, tu confirmes avoir lu et accepté 
                            ces conditions d'utilisation ainsi que notre politique de confidentialité.
                        </Text>
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
