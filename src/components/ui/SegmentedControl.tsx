// ============================================================================
// SEGMENTED CONTROL - Onglets segmentés
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../constants';

interface SegmentedControlProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({ 
  options, 
  value, 
  onChange 
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={String(option.value)}
          style={[
            styles.segment,
            value === option.value && styles.segmentActive,
          ]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.segmentText,
            value === option.value && styles.segmentTextActive,
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  segment: {
    flex: 1,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(227, 160, 144, 0.22)',
    borderColor: 'rgba(227, 160, 144, 0.40)',
  },
  segmentText: {
    color: 'rgba(255, 255, 255, 0.80)',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  segmentTextActive: {
    color: Colors.text,
  },
});
