// ============================================================================
// ADD ENTRY BOTTOM SHEET - Modal avec @gorhom/bottom-sheet
// ============================================================================

import React, { useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { AddEntryForm } from '../forms';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import type { Entry } from '../../types';

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
        const bottomSheetRef = useRef<BottomSheet>(null);
        const snapPoints = useMemo(() => ['85%'], []);
        const [formKey, setFormKey] = useState(0);
        const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

        useImperativeHandle(ref, () => ({
            present: () => {
                setEditingEntry(null);
                bottomSheetRef.current?.expand();
            },
            dismiss: () => bottomSheetRef.current?.close(),
            edit: (entry: Entry) => {
                setEditingEntry(entry);
                bottomSheetRef.current?.expand();
            },
        }));

        const handleSuccess = useCallback(() => {
            bottomSheetRef.current?.close();
            setEditingEntry(null);
            onSuccess?.();
        }, [onSuccess]);

        const handleSheetChanges = useCallback((index: number) => {
            if (index === -1) {
                setFormKey(prev => prev + 1);
                setEditingEntry(null);
            }
        }, []);

        const renderBackdrop = useCallback(
            (props: BottomSheetBackdropProps) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    opacity={0.5}
                />
            ),
            []
        );

        const handleDismiss = useCallback(() => {
            bottomSheetRef.current?.close();
            setEditingEntry(null);
        }, []);

        return (
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
                onChange={handleSheetChanges}
            >
                <BottomSheetView style={styles.contentContainer}>
                    <Text style={styles.title}>
                        {editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
                    </Text>
                    <AddEntryForm 
                        key={formKey} 
                        onSuccess={handleSuccess} 
                        onDismiss={handleDismiss}
                        editEntry={editingEntry}
                    />
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: 'rgba(20, 20, 26, 0.98)',
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
    },
    handleIndicator: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        width: 40,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
});
