// ============================================================================
// DAY BADGE - Jour de la semaine avec état
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

export function DayBadge({ 
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
}

const styles = StyleSheet.create({
  day: {
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  dayDone: {
    backgroundColor: 'rgba(227, 160, 144, 0.35)',
    borderColor: 'rgba(227, 160, 144, 0.55)',
  },
  dayToday: {
    borderColor: 'rgba(255, 255, 255, 0.30)',
  },
  dow: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 6,
  },
  date: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  dateToday: {
    color: Colors.text,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  check: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});
