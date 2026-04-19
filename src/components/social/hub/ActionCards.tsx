import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Plus, Share2 } from 'lucide-react-native';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '../../../constants';

interface ActionCardsProps {
    onPressShareWorkout: () => void;
    onPressCreateChallenge: () => void;
    labels: {
        shareTitle: string;
        shareSubtitle: string;
        challengeTitle: string;
        challengeSubtitle: string;
    };
}

export function ActionCards({ onPressShareWorkout, onPressCreateChallenge, labels }: ActionCardsProps) {
    const cards = [
        {
            id: 'share',
            title: labels.shareTitle,
            subtitle: labels.shareSubtitle,
            icon: Share2,
            onPress: onPressShareWorkout,
            colors: [Colors.overlayTeal15, Colors.overlayInfo12] as [string, string],
            iconBg: Colors.overlayTeal20,
            iconColor: Colors.info,
        },
        {
            id: 'challenge',
            title: labels.challengeTitle,
            subtitle: labels.challengeSubtitle,
            icon: Plus,
            onPress: onPressCreateChallenge,
            colors: [Colors.overlayCozyWarm15, Colors.overlayViolet12] as [string, string],
            iconBg: Colors.overlayCozyWarm15,
            iconColor: Colors.cta,
        },
    ];

    return (
        <View style={styles.container}>
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <TouchableOpacity key={card.id} activeOpacity={0.9} onPress={card.onPress}>
                        <LinearGradient
                            colors={card.colors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.card}
                        >
                            <View style={[styles.iconWrap, { backgroundColor: card.iconBg }]}>
                                <Icon size={18} color={card.iconColor} />
                            </View>

                            <View style={styles.textWrap}>
                                <Text style={styles.title}>{card.title}</Text>
                                <Text style={styles.subtitle}>{card.subtitle}</Text>
                            </View>

                            <View style={styles.arrowWrap}>
                                <ChevronRight size={16} color={Colors.muted} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    card: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.strokeLight,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: 88,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: Colors.overlayWhite15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    subtitle: {
        color: Colors.muted2,
        fontSize: FontSize.xs,
        marginTop: 2,
        lineHeight: 15,
    },
    arrowWrap: {
        width: 28,
        height: 28,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.overlayBlack25,
    },
});
