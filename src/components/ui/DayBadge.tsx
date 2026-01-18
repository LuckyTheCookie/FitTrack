// ============================================================================
// DAY BADGE - Jour de la semaine avec état (Optimisé avec React.memo)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight } from '../../constants';

interface DayBadgeProps {
    dayOfWeek: string;
    dayNumber: number;
    isToday: boolean;
    isDone: boolean;
    onPress?: () => void;
}

export const DayBadge = React.memo(function DayBadge({
    dayOfWeek,
    dayNumber,
    isToday,
    isDone,
    onPress,
}: DayBadgeProps) {
    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container
            style={[
                styles.day,
                isDone && styles.dayDone,
                isToday && styles.dayToday,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={styles.dow}>{dayOfWeek}</Text>
            {isDone ? (
                <View style={styles.checkCircle}>
                    <Text style={styles.check}>✓</Text>
                </View>
            ) : (
                <Text style={[styles.date, isToday && styles.dateToday]}>{dayNumber}</Text>
            )}
        </Container>
    );
});

const styles = StyleSheet.create({
    day: {
        flex: 1,
        borderRadius: BorderRadius.md,
        paddingVertical: 12,
        paddingHorizontal: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        minWidth: 40,
    },
    dayDone: {
        backgroundColor: 'rgba(227, 160, 144, 0.40)',
        borderColor: 'rgba(227, 160, 144, 0.60)',
    },
    dayToday: {
        borderColor: 'rgba(255, 255, 255, 0.35)',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    dow: {
        fontSize: FontSize.xs,
        color: 'rgba(255, 255, 255, 0.72)',  // Improved contrast
        marginBottom: 6,
        fontWeight: FontWeight.medium,
    },
    date: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: 'rgba(255, 255, 255, 0.88)',  // Improved contrast
    },
    dateToday: {
        color: Colors.text,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    check: {
        color: Colors.text,
        fontSize: 11,
        fontWeight: FontWeight.bold,
    },
});
