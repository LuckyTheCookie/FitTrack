import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Shield } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '../../constants';

interface CountdownBannerProps {
  visible: boolean;
  seconds: number;
  onPress: () => void;
}

export function CountdownBanner({ visible, seconds, onPress }: CountdownBannerProps) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  const progressRatio = Math.max(0, Math.min(1, seconds / 60));

  return (
    <TouchableOpacity style={styles.wrapper} activeOpacity={0.9} onPress={onPress}>
      <BlurView intensity={28} tint="dark" style={styles.inner}>
        <View style={styles.row}>
          <Shield size={16} color={Colors.text} />
          <Text style={styles.text}>{t('safety.overlay.upcomingCheck', { seconds })}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inner: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  text: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  progressTrack: {
    marginTop: Spacing.sm,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.text,
    borderRadius: BorderRadius.full,
  },
});
