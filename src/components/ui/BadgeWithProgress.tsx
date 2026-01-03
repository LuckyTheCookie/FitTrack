// ============================================================================
// BADGE WITH PROGRESS - Badge avec barre de progression
// ============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Badge } from '../../types';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../constants';
import { formatDisplayDate } from '../../utils/date';

interface BadgeWithProgressProps {
  badge: Badge;
  currentProgress?: number; // 0-100 ou undefined si pas calculable
  progressLabel?: string;
}

export function BadgeWithProgress({ badge, currentProgress, progressLabel }: BadgeWithProgressProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { t } = useTranslation();
  const isUnlocked = !!badge.unlockedAt;
  const progress = currentProgress || 0;

  const localizedName = t(`badges.${badge.id}.name`, { defaultValue: badge.name });
  const localizedDesc = t(`badges.${badge.id}.description`, { defaultValue: badge.description });

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, !isUnlocked && styles.locked]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{badge.icon}</Text>
          {isUnlocked && <View style={styles.unlockedBadge} />}
        </View>
        
        <View style={styles.info}>
          <Text style={[styles.name, !isUnlocked && styles.textLocked]}>
            {localizedName}
          </Text>
          
          {!isUnlocked && currentProgress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.floor(progress)}%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Modal avec détails */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>{badge.icon}</Text>
            <Text style={styles.modalTitle}>{localizedName}</Text>
            <Text style={styles.modalDescription}>{localizedDesc}</Text>
            
            {isUnlocked ? (
              <View style={styles.unlockedSection}>
                <Text style={styles.unlockedText}>🎉 {t('badges.unlocked')}</Text>
                {badge.unlockedAt && (
                  <Text style={styles.unlockedDate}>
                    {formatDisplayDate(badge.unlockedAt)}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.lockedSection}>
                <Text style={styles.lockedText}>🔒 {t('badges.locked')}</Text>
                {progressLabel && (
                  <Text style={styles.progressLabel}>{progressLabel}</Text>
                )}
                {currentProgress !== undefined && (
                  <View style={styles.modalProgressBar}>
                    <View style={[styles.modalProgressFill, { width: `${Math.min(progress, 100)}%` }]} />
                  </View>
                )}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 12,
  },
  locked: {
    opacity: 0.5,
  },
  iconContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(227, 160, 144, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
  },
  unlockedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  textLocked: {
    color: Colors.muted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.cta,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: FontSize.xs,
    color: Colors.muted2,
    minWidth: 35,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.cardSolid,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  modalIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  modalDescription: {
    fontSize: FontSize.md,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  unlockedSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  unlockedText: {
    fontSize: FontSize.lg,
    color: Colors.success,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  unlockedDate: {
    fontSize: FontSize.sm,
    color: Colors.muted2,
  },
  lockedSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  lockedText: {
    fontSize: FontSize.lg,
    color: Colors.muted,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: Colors.cta,
    borderRadius: BorderRadius.full,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  closeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
});
