// ============================================================================
// ADD ENTRY BOTTOM SHEET - Modal avec @lodev09/react-native-true-sheet
// Design premium avec glassmorphism
// ============================================================================

import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Dimensions,
    Platform,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Edit3 } from 'lucide-react-native';
import { AddEntryForm } from '../forms';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import type { Entry } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AddEntryBottomSheetRef {
    present: () => void;
    dismiss: () => void;
    edit: (entry: Entry) => void;
}

interface AddEntryBottomSheetProps {
    onSuccess?: () => void;
}

export const AddEntryBottomSheet = forwardRef<AddEntryBottomSheetRef, AddEntryBottomSheetProps>(
    ({ onSuccess }, ref) => {
        const sheetRef = useRef<TrueSheet>(null);
        const [formKey, setFormKey] = useState(0);
        const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
        const [isVisible, setIsVisible] = useState(false);

        useImperativeHandle(ref, () => ({
            present: () => {
                setEditingEntry(null);
                setIsVisible(true);
                sheetRef.current?.present();
            },
            dismiss: () => {
                sheetRef.current?.dismiss();
            },
            edit: (entry: Entry) => {
                setEditingEntry(entry);
                setIsVisible(true);
                sheetRef.current?.present();
            },
        }));

        const handleSuccess = useCallback(() => {
            sheetRef.current?.dismiss();
            setEditingEntry(null);
            onSuccess?.();
        }, [onSuccess]);

        const handleDismiss = useCallback(() => {
            setFormKey(prev => prev + 1);
            setEditingEntry(null);
            setIsVisible(false);
        }, []);

        const handlePresent = useCallback(() => {
            setIsVisible(true);
        }, []);

        return (
            <TrueSheet
                ref={sheetRef}
                detents={[0.95]}
                cornerRadius={32}
                backgroundColor={Colors.bg}
                onDidDismiss={handleDismiss}
                onDidPresent={handlePresent}
                grabber={false}
                scrollable={true} // ✅ MODIFICATION IMPORTANTE : Active le scroll natif de la sheet
            >
                <View style={styles.container}>
                    {/* Header avec design premium (Reste FIXE) */}
                    <View style={styles.header}>
                        {/* Grabber personnalisé */}
                        <View style={styles.grabberContainer}>
                            <View style={styles.grabber} />
                        </View>
                        
                        {/* Titre avec icône */}
                        <View style={styles.titleRow}>
                            <LinearGradient
                                colors={['rgba(215, 150, 134, 0.25)', 'rgba(215, 150, 134, 0.08)']}
                                style={styles.iconBadge}
                            >
                                {editingEntry ? (
                                    <Edit3 size={20} color={Colors.cta} />
                                ) : (
                                    <Sparkles size={20} color={Colors.cta} />
                                )}
                            </LinearGradient>
                            <View style={styles.titleTextContainer}>
                                <Text style={styles.title}>
                                    {editingEntry ? 'Modifier' : 'Nouvelle entrée'}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {editingEntry 
                                        ? 'Mets à jour tes données' 
                                        : 'Ajoute une activité ou une mesure'
                                    }
                                </Text>
                            </View>
                        </View>
                        
                        {/* Ligne décorative */}
                        <LinearGradient
                            colors={['transparent', 'rgba(215, 150, 134, 0.3)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.divider}
                        />
                    </View>

                    {/* Contenu avec scroll (C'est ICI que ça scrollera) */}
                    <ScrollView 
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={true}
                        nestedScrollEnabled={true} // ✅ MODIFICATION IMPORTANTE : Pour Android si imbriqué
                    >
                        {isVisible && (
                            <AddEntryForm 
                                key={formKey} 
                                onSuccess={handleSuccess} 
                                onDismiss={() => sheetRef.current?.dismiss()}
                                editEntry={editingEntry}
                            />
                        )}
                        
                        {/* Spacer pour le bas */}
                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                </View>
            </TrueSheet>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
        minHeight: SCREEN_HEIGHT * 0.85,
    },
    header: {
        paddingTop: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        // Pas de backgroundColor ici pour garder la transparence si besoin,
        // mais le container parent a déjà Colors.bg
    },
    grabberContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    grabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.md,
        gap: Spacing.md,
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(215, 150, 134, 0.2)',
    },
    titleTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginTop: Spacing.lg,
    },
    scrollView: {
        flex: 1, // Important pour que la ScrollView prenne tout l'espace restant sous le header
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xl, // Ajout d'un padding en bas pour la sécurité
    },
    bottomSpacer: {
        height: Platform.OS === 'ios' ? 40 : 24,
    },
});
