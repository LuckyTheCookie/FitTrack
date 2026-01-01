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
import { ArrowLeft, Shield, Lock, Server, Bell, Trash2, Heart } from 'lucide-react-native';
import { GlassCard } from '../src/components/ui';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';

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
                <Text style={styles.title}>Politique de Confidentialité</Text>
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
                    <Text style={styles.intro}>
                        FitTrack respecte ta vie privée. Cette politique explique comment nous 
                        traitons tes données selon le RGPD (Règlement Général sur la Protection des Données).
                    </Text>
                    <Text style={styles.lastUpdate}>
                        Dernière mise à jour : 1er janvier 2026
                    </Text>
                </Animated.View>

                {/* Mode Local */}
                <PolicySection 
                    title="Mode Local (par défaut)" 
                    icon={<Lock size={20} color="#4ade80" />}
                    iconColor="#4ade80"
                    delay={200}
                >
                    <Text style={styles.paragraph}>
                        Par défaut, FitTrack fonctionne en mode 100% local. Tes données restent 
                        uniquement sur ton appareil.
                    </Text>
                    <Text style={styles.subheading}>Données stockées localement :</Text>
                    <BulletPoint>Séances d'entraînement (exercices, durées, répétitions)</BulletPoint>
                    <BulletPoint>Courses (distance, temps, vitesse)</BulletPoint>
                    <BulletPoint>Repas et notes nutritionnelles</BulletPoint>
                    <BulletPoint>Mensurations (poids, tour de taille, etc.)</BulletPoint>
                    <BulletPoint>Objectifs et paramètres personnalisés</BulletPoint>
                    <BulletPoint>Badges et progression gamification</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.highlight]}>
                        ✅ Aucune donnée n'est envoyée à un serveur en mode local.
                    </Text>
                </PolicySection>

                {/* Mode Social */}
                <PolicySection 
                    title="Mode Social (opt-in)" 
                    icon={<Server size={20} color="#22d3ee" />}
                    iconColor="#22d3ee"
                    delay={300}
                >
                    <Text style={styles.paragraph}>
                        Si tu actives les fonctionnalités sociales, certaines données sont 
                        partagées avec notre serveur Supabase pour permettre le classement et les interactions.
                    </Text>
                    
                    <Text style={styles.subheading}>Données synchronisées :</Text>
                    <BulletPoint>Pseudo public (que tu choisis)</BulletPoint>
                    <BulletPoint>XP total et niveau</BulletPoint>
                    <BulletPoint>Streak actuel et meilleur streak</BulletPoint>
                    <BulletPoint>Nombre de séances hebdomadaires</BulletPoint>
                    <BulletPoint>Distance et durée totales hebdomadaires</BulletPoint>
                    
                    <Text style={styles.subheading}>Données de compte :</Text>
                    <BulletPoint>Email (uniquement pour la connexion)</BulletPoint>
                    <BulletPoint>Mot de passe (chiffré, jamais accessible)</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.warning]}>
                        ⚠️ Le contenu détaillé de tes séances (exercices, notes, repas) 
                        n'est JAMAIS synchronisé.
                    </Text>
                </PolicySection>

                {/* Notifications */}
                <PolicySection 
                    title="Notifications Push" 
                    icon={<Bell size={20} color="#fbbf24" />}
                    iconColor="#fbbf24"
                    delay={400}
                >
                    <Text style={styles.paragraph}>
                        Les notifications push sont utilisées pour :
                    </Text>
                    <BulletPoint>Rappels de streak (configurables)</BulletPoint>
                    <BulletPoint>Encouragements de tes amis (mode social)</BulletPoint>
                    <BulletPoint>Demandes d'ami (mode social)</BulletPoint>
                    
                    <Text style={styles.subheading}>Technologies utilisées :</Text>
                    <BulletPoint>Expo Push Notifications</BulletPoint>
                    <BulletPoint>Firebase Cloud Messaging (FCM)</BulletPoint>
                    
                    <Text style={styles.paragraph}>
                        Tu peux désactiver les notifications à tout moment dans les paramètres 
                        de ton appareil.
                    </Text>
                </PolicySection>

                {/* Health Connect */}
                <PolicySection 
                    title="Health Connect (Android)" 
                    icon={<Heart size={20} color="#f43f5e" />}
                    iconColor="#f43f5e"
                    delay={450}
                >
                    <Text style={styles.paragraph}>
                        FitTrack peut importer des séances d'entraînement depuis Google Health Connect 
                        sur Android. Cette fonctionnalité est optionnelle.
                    </Text>
                    
                    <Text style={styles.subheading}>Données accessibles :</Text>
                    <BulletPoint>Séances d'exercice (type, durée, date)</BulletPoint>
                    <BulletPoint>Distance parcourue</BulletPoint>
                    <BulletPoint>Calories brûlées</BulletPoint>
                    <BulletPoint>Fréquence cardiaque (si disponible)</BulletPoint>
                    
                    <Text style={styles.subheading}>Utilisation des données :</Text>
                    <BulletPoint>Import local uniquement - aucun envoi serveur</BulletPoint>
                    <BulletPoint>Conversion en entrées FitTrack locales</BulletPoint>
                    <BulletPoint>Tu choisis quelles séances importer</BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.highlight]}>
                        ✅ Les données Health Connect sont lues une seule fois et stockées 
                        localement. FitTrack n'écrit jamais dans Health Connect.
                    </Text>
                    
                    <Text style={styles.paragraph}>
                        Tu peux révoquer l'accès à tout moment dans les paramètres 
                        Health Connect de ton appareil.
                    </Text>
                </PolicySection>

                {/* Tes droits RGPD */}
                <PolicySection 
                    title="Tes Droits (RGPD)" 
                    icon={<Trash2 size={20} color="#f87171" />}
                    iconColor="#f87171"
                    delay={550}
                >
                    <Text style={styles.paragraph}>
                        Conformément au RGPD, tu as le droit de :
                    </Text>
                    <BulletPoint>
                        <Text style={styles.bold}>Accès</Text> : Consulter toutes tes données (export JSON dans Paramètres)
                    </BulletPoint>
                    <BulletPoint>
                        <Text style={styles.bold}>Rectification</Text> : Modifier tes informations de profil
                    </BulletPoint>
                    <BulletPoint>
                        <Text style={styles.bold}>Suppression</Text> : Supprimer toutes tes données en un clic
                    </BulletPoint>
                    <BulletPoint>
                        <Text style={styles.bold}>Portabilité</Text> : Exporter tes données au format JSON
                    </BulletPoint>
                    <BulletPoint>
                        <Text style={styles.bold}>Opposition</Text> : Désactiver les fonctionnalités sociales
                    </BulletPoint>
                    
                    <Text style={[styles.paragraph, styles.highlight]}>
                        💡 Pour supprimer tes données en ligne, désactive les fonctionnalités 
                        sociales dans Paramètres → Social.
                    </Text>
                </PolicySection>

                {/* Contact */}
                <Animated.View entering={FadeInDown.delay(650).springify()}>
                    <GlassCard style={styles.contactCard}>
                        <Text style={styles.contactTitle}>Contact</Text>
                        <Text style={styles.contactText}>
                            Pour toute question concernant tes données personnelles, 
                            contacte-nous via les paramètres de l'application.
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
