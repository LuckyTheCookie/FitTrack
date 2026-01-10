// ============================================================================
// EXERCISE SELECTOR - Grid of exercise buttons
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import { EXERCISES, type ExerciseConfig } from './types';

interface ExerciseSelectorProps {
    onSelect: (exercise: ExerciseConfig) => void;
    selectedExercise: ExerciseConfig | null;
}

/**
 * Grid component for selecting an exercise type
 */
export function ExerciseSelector({ onSelect, selectedExercise }: ExerciseSelectorProps) {
    const { t } = useTranslation();

    return (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.exerciseGrid}>
            {EXERCISES.map((exercise, index) => (
                <Animated.View
                    key={exercise.id}
                    entering={FadeInDown.delay(300 + index * 100).springify()}
                >
                    <TouchableOpacity
                        onPress={() => onSelect(exercise)}
                        activeOpacity={0.8}
                        style={[
                            styles.exerciseCard,
                            selectedExercise?.id === exercise.id && { borderColor: exercise.color, borderWidth: 2 },
                        ]}
                    >
                        <LinearGradient
                            colors={[`${exercise.color}22`, `${exercise.color}11`]}
                            style={styles.exerciseCardGradient}
                        >
                            <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
                            <Text style={styles.exerciseName}>
                                {t(`repCounter.exercises.${exercise.id === 'jumping_jacks' ? 'jumpingJacks' : exercise.id}`)}
                            </Text>
                            {selectedExercise?.id === exercise.id && (
                                <View style={[styles.selectedBadge, { backgroundColor: exercise.color }]}>
                                    <Check size={12} color="#fff" strokeWidth={3} />
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            ))}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    exerciseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    exerciseCard: {
        width: 140,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    exerciseCardGradient: {
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    exerciseIcon: {
        fontSize: 40,
    },
    exerciseName: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        textAlign: 'center',
    },
    selectedBadge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ExerciseSelector;
