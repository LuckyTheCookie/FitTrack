// ============================================================================
// INPUT FIELD - Champ de saisie stylé
// ============================================================================

import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants';

interface InputFieldProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
}

export function InputField({ 
  label, 
  containerStyle,
  style,
  ...props 
}: InputFieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor="rgba(255, 255, 255, 0.35)"
        {...props}
      />
    </View>
  );
}

interface TextAreaProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
  rows?: number;
}

export function TextArea({ 
  label, 
  containerStyle,
  rows = 3,
  style,
  ...props 
}: TextAreaProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, styles.textArea, { minHeight: rows * 24 + 24 }, style]}
        placeholderTextColor="rgba(255, 255, 255, 0.35)"
        multiline
        textAlignVertical="top"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.70)',
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: BorderRadius.md,
    padding: 12,
    color: Colors.text,
    fontSize: FontSize.lg,
  },
  textArea: {
    paddingTop: 12,
  },
});
