// ============================================================================
// BOUTONS - Variantes CTA, Ghost, Link
// ============================================================================

import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, FontSize, FontWeight, Shadows, Spacing } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'cta' | 'primary' | 'ghost' | 'link';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ 
  title, 
  onPress, 
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'cta') {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={isDisabled}
        style={[styles.ctaWrapper, isDisabled && styles.disabled, style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#e3a090', '#d79686']}
          style={styles.ctaGradient}
        >
          {loading ? (
            <ActivityIndicator color="#1b0f0c" />
          ) : (
            <>
              {icon && <Text style={styles.ctaIcon}>{icon}</Text>}
              <Text style={[styles.ctaText, textStyle]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'link') {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={isDisabled}
        style={[styles.linkWrapper, style]}
      >
        <Text style={[styles.linkText, isDisabled && styles.linkDisabled, textStyle]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={isDisabled}
        style={[styles.ghostButton, isDisabled && styles.disabled, style]}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text} />
        ) : (
          <Text style={[styles.ghostText, textStyle]}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  // Primary
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[style]}
    >
      <LinearGradient
        colors={['#e3a090', '#d79686']}
        style={[styles.primaryButton, isDisabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#1b0f0c" />
        ) : (
          <Text style={[styles.primaryText, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // CTA (grand bouton principal)
  ctaWrapper: {
    borderRadius: BorderRadius.xl,
    ...Shadows.cta,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xl,
  },
  ctaIcon: {
    fontSize: 18,
  },
  ctaText: {
    color: '#1b0f0c',
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
  },

  // Primary
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#1b0f0c',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
  },

  // Ghost
  ghostButton: {
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.stroke,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
  },

  // Link
  linkWrapper: {
    padding: Spacing.xs,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: FontSize.md,
  },
  linkDisabled: {
    opacity: 0.5,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
});
