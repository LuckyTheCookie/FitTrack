// ============================================================================
// IMPORT MODAL — Import JSON d'exercices avec style premium
// ============================================================================

import {
    View, Text, StyleSheet, Modal, Pressable,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Copy, Download } from 'lucide-react-native';
import { TextArea } from '../ui';
import { FC, FS, FR, FT, FW } from './formStyles';

interface ImportModalProps {
    visible: boolean;
    jsonInput: string;
    onChangeJson: (v: string) => void;
    onImport: () => void;
    onCopyExample: () => void;
    onClose: () => void;
}

export function ImportModal({
    visible, jsonInput, onChangeJson,
    onImport, onCopyExample, onClose,
}: ImportModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={st.backdrop} onPress={onClose}>
                <Pressable style={st.sheet} onPress={e => e.stopPropagation()}>
                    {/* Handle */}
                    <View style={st.handle} />

                    {/* Header */}
                    <View style={st.header}>
                        <View>
                            <Text style={st.title}>Importer une séance</Text>
                            <Text style={st.subtitle}>Colle un JSON avec tes exercices</Text>
                        </View>
                        <TouchableOpacity style={st.closeBtn} onPress={onClose} activeOpacity={0.7}>
                            <X size={16} color={FC.textMuted} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    {/* Format example */}
                    <View style={st.exampleCard}>
                        <View style={st.exampleHeader}>
                            <Text style={st.exampleLabel}>FORMAT ATTENDU</Text>
                            <TouchableOpacity
                                style={st.copyBtn}
                                onPress={onCopyExample}
                                activeOpacity={0.7}
                            >
                                <Copy size={12} color={FC.coral} strokeWidth={2.5} />
                                <Text style={st.copyBtnText}>Copier l'exemple</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={st.exampleCode}>{`{\n  "exercises": [\n    { "name": "Pompes", "sets": 3, "reps": 12 },\n    { "name": "Squats", "sets": 4, "reps": 20 }\n  ],\n  "includeAbsBlock": true\n}`}</Text>
                    </View>

                    {/* Zone de saisie */}
                    <TextArea
                        placeholder='{ "exercises": [...] }'
                        value={jsonInput}
                        onChangeText={onChangeJson}
                        rows={5}
                    />

                    {/* Bouton import */}
                    <TouchableOpacity
                        onPress={onImport}
                        activeOpacity={0.82}
                        style={st.importBtnWrap}
                    >
                        <LinearGradient
                            colors={[FC.coral, FC.amber]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={st.importBtn}
                        >
                            <Download size={18} color="#1a0800" strokeWidth={2.5} />
                            <Text style={st.importBtnText}>Importer</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const st = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: FC.surfaceUp,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderColor: FC.border,
        padding: FS.xl,
        paddingTop: FS.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 20,
    },
    handle: {
        width: 36, height: 4,
        borderRadius: FR.pill,
        backgroundColor: FC.border,
        alignSelf: 'center',
        marginBottom: FS.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: FS.xl,
    },
    title: {
        fontSize: FT.xl,
        fontWeight: FW.black,
        color: FC.text,
        letterSpacing: -0.4,
        marginBottom: FS.xs,
    },
    subtitle: {
        fontSize: FT.sm,
        color: FC.textMuted,
        fontWeight: FW.med,
    },
    closeBtn: {
        width: 32, height: 32,
        borderRadius: FR.pill,
        backgroundColor: FC.overlay,
        borderWidth: 1,
        borderColor: FC.border,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Exemple JSON
    exampleCard: {
        backgroundColor: FC.bg,
        borderRadius: FR.xl,
        borderWidth: 1,
        borderColor: FC.border,
        padding: FS.lg,
        marginBottom: FS.lg,
    },
    exampleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: FS.md,
    },
    exampleLabel: {
        fontSize: FT.micro,
        fontWeight: FW.black,
        color: FC.textMuted,
        letterSpacing: 1.8,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: FS.xs,
        paddingHorizontal: FS.md,
        paddingVertical: FS.xs,
        backgroundColor: FC.coralSoft,
        borderRadius: FR.pill,
        borderWidth: 1,
        borderColor: FC.coralGlow,
    },
    copyBtnText: {
        fontSize: FT.xs,
        fontWeight: FW.bold,
        color: FC.coral,
        letterSpacing: 0.3,
    },
    exampleCode: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: FC.textSub,
        lineHeight: 18,
    },

    // Bouton import
    importBtnWrap: {
        borderRadius: FR.xxl,
        overflow: 'hidden',
        marginTop: FS.md,
        shadowColor: FC.coral,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 8,
    },
    importBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: FS.md,
        paddingVertical: 17,
    },
    importBtnText: {
        fontSize: FT.lg,
        fontWeight: FW.black,
        color: '#1a0800',
        letterSpacing: -0.3,
    },
});
