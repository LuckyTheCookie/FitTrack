
// ============================================================================
// GAMIFICATION SCREEN
// ============================================================================

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GlassCard, SectionHeader, Button } from '../src/components/ui';
import { useGamificationStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, withSpring, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// Asset local (à vérifier si le chemin est correct via require ou uri)
// Le user a indiqué: assets/ploppy.png
const PLOPPY_IMAGE = require('../assets/ploppy.png');

export default function GamificationScreen() {
    const { xp, level, rank, quests, generateWeeklyQuests } = useGamificationStore();
    const scale = useSharedValue(1);

    // Animation de respiration pour Ploppy
    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2000 }),
                withTiming(1, { duration: 2000 })
            ),
            -1,
            true
        );

        // Générer des quêtes si vide
        if (quests.length === 0) {
            generateWeeklyQuests();
        }
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const xpForNextLevel = level * 100;
    const progress = Math.min(Math.max(xp / xpForNextLevel, 0), 1);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* HEADER - PLOPPY & LEVEL */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
                    <View style={styles.ploppyContainer}>
                        <View style={styles.glow} />
                        <Animated.Image
                            source={PLOPPY_IMAGE}
                            style={[styles.ploppyImage, animatedStyle]}
                            resizeMode="contain"
                        />
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>{level}</Text>
                        </View>
                    </View>

                    <Text style={styles.rankTitle}>{rank}</Text>
                    <Text style={styles.xpText}>{xp} / {xpForNextLevel} XP</Text>

                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                    </View>
                </Animated.View>

                {/* QUESTS SECTION */}
                <View style={styles.section}>
                    <SectionHeader title="Quêtes Hebdomadaires" />

                    <View style={styles.questsList}>
                        {quests.map((quest, index) => (
                            <Animated.View
                                key={quest.id}
                                entering={FadeInUp.delay(300 + index * 100).springify()}
                            >
                                <GlassCard style={[styles.questCard, quest.completed ? styles.questCardCompleted : {}]}>
                                    <View style={styles.questHeader}>
                                        <Text style={[styles.questTitle, quest.completed ? styles.questTitleCompleted : {}]}>
                                            {quest.description}
                                        </Text>
                                        <View style={styles.xpBadge}>
                                            <Text style={styles.xpBadgeText}>+{quest.rewardXp} XP</Text>
                                        </View>
                                    </View>

                                    <View style={styles.questFooter}>
                                        <Text style={styles.questProgress}>
                                            {quest.current} / {quest.target}
                                        </Text>
                                        <View style={styles.miniProgressBg}>
                                            <View
                                                style={[
                                                    styles.miniProgressFill,
                                                    { width: `${Math.min((quest.current / quest.target) * 100, 100)}%` },
                                                    quest.completed ? { backgroundColor: Colors.success } : undefined
                                                ]}
                                            />
                                        </View>
                                    </View>
                                </GlassCard>
                            </Animated.View>
                        ))}
                    </View>
                </View>

                <View style={styles.spacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
        marginTop: Spacing.xl,
    },
    ploppyContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    ploppyImage: {
        width: '100%',
        height: '100%',
    },
    glow: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: Colors.cta,
        opacity: 0.2,
        filter: 'blur(40px)', // Note: might not work on all RN versions, simplified visual fallback handled by opacity
    },
    levelBadge: {
        position: 'absolute',
        bottom: 0,
        right: 40,
        backgroundColor: Colors.cardSolid,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.cta,
    },
    levelText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    rankTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    xpText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        marginBottom: Spacing.md,
    },
    progressBarBg: {
        width: '80%',
        height: 8,
        backgroundColor: Colors.overlay,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.cta,
        borderRadius: 4,
    },
    section: {
        marginTop: Spacing.lg,
    },
    questsList: {
        gap: Spacing.md,
    },
    questCard: {
        padding: Spacing.md,
    },
    questCardCompleted: {
        opacity: 0.6,
    },
    questHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    questTitle: {
        fontSize: FontSize.md,
        color: Colors.text,
        flex: 1,
        marginRight: Spacing.md,
    },
    questTitleCompleted: {
        textDecorationLine: 'line-through',
        color: Colors.muted,
    },
    xpBadge: {
        backgroundColor: Colors.overlay,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    xpBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        color: Colors.warning,
    },
    questFooter: {
        gap: 6,
    },
    questProgress: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    miniProgressBg: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        width: '100%',
    },
    miniProgressFill: {
        height: '100%',
        backgroundColor: Colors.warning,
        borderRadius: 2,
    },
    spacer: {
        height: 40,
    },
});
