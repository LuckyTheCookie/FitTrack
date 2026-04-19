// ============================================================================
// WORKOUT FORM — Formulaire séance maison + builder d'exercices
// ============================================================================

import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput,
} from 'react-native';
import { Plus, Trash2, FileJson } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { InputField } from '../ui';
import { FC, FS, FR, FT, FW, sharedStyles } from './formStyles';

interface Exercise {
    id: string;
    name: string;
    reps: string;
    sets: string;
}

interface WorkoutFormProps {
    name: string;
    duration: string;
    exercises: Exercise[];
    withAbsBlock: boolean;
    onChangeName: (v: string) => void;
    onChangeDuration: (v: string) => void;
    onAddExercise: () => void;
    onRemoveExercise: (i: number) => void;
    onUpdateExercise: (i: number, field: keyof Exercise, v: string) => void;
    onToggleAbs: () => void;
    onOpenImport: () => void;
}

export function WorkoutForm({
    name, duration, exercises, withAbsBlock,
    onChangeName, onChangeDuration,
    onAddExercise, onRemoveExercise, onUpdateExercise,
    onToggleAbs, onOpenImport,
}: WorkoutFormProps) {
    const { t } = useTranslation();

    return (
        <View>
            {/* Nom + durée */}
            <View style={sharedStyles.row}>
                <InputField
                    label={t('addEntry.sessionName')}
                    placeholder="Push Day"
                    value={name}
                    onChangeText={onChangeName}
                    containerStyle={sharedStyles.halfInput}
                />
                <View style={st.durationWrap}>
                    <InputField
                        label={t('addEntry.duration')}
                        placeholder="45"
                        value={duration}
                        onChangeText={onChangeDuration}
                        keyboardType="number-pad"
                    />
                </View>
            </View>

            {/* Builder exercices */}
            <View style={st.exercisesCard}>
                <View style={st.exercisesHeader}>
                    <Text style={st.exercisesTitle}>Exercices</Text>
                    <View style={st.exercisesHeaderActions}>
                        <TouchableOpacity style={st.headerActionBtn} onPress={onOpenImport} activeOpacity={0.7}>
                            <FileJson size={14} color={FC.textMuted} strokeWidth={2} />
                            <Text style={st.headerActionText}>JSON</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Légende colonnes */}
                <View style={st.colLabels}>
                    <Text style={[st.colLabel, { flex: 1 }]}>EXERCICE</Text>
                    <Text style={[st.colLabel, { width: 44 }]}>SÉRIES</Text>
                    <Text style={[st.colLabel, { width: 8 }]} />
                    <Text style={[st.colLabel, { width: 52 }]}>REPS</Text>
                    <View style={{ width: 32 }} />
                </View>

                {/* Lignes exercices */}
                {exercises.map((ex, i) => (
                    <View key={ex.id} style={[st.exRow, i === exercises.length - 1 && { marginBottom: 0 }]}>
                        {/* Numéro */}
                        <View style={st.exNum}>
                            <Text style={st.exNumText}>{i + 1}</Text>
                        </View>

                        {/* Nom */}
                        <TextInput
                            style={[st.exInput, { flex: 1 }]}
                            placeholder="Exercice"
                            placeholderTextColor={FC.textMuted}
                            value={ex.name}
                            onChangeText={v => onUpdateExercise(i, 'name', v)}
                        />

                        {/* Séries */}
                        <TextInput
                            style={[st.exInput, st.exInputSmall]}
                            placeholder="3"
                            placeholderTextColor={FC.textMuted}
                            value={ex.sets}
                            onChangeText={v => onUpdateExercise(i, 'sets', v)}
                            keyboardType="number-pad"
                        />

                        {/* Séparateur × */}
                        <Text style={st.xMark}>×</Text>

                        {/* Reps */}
                        <TextInput
                            style={[st.exInput, st.exInputSmall]}
                            placeholder="12"
                            placeholderTextColor={FC.textMuted}
                            value={ex.reps}
                            onChangeText={v => onUpdateExercise(i, 'reps', v)}
                        />

                        {/* Supprimer */}
                        {exercises.length > 1 ? (
                            <TouchableOpacity
                                style={st.removeBtn}
                                onPress={() => onRemoveExercise(i)}
                                activeOpacity={0.7}
                            >
                                <Trash2 size={13} color={FC.error} strokeWidth={2} />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 32 }} />
                        )}
                    </View>
                ))}

                {/* Ajouter exercice */}
                <TouchableOpacity style={st.addExBtn} onPress={onAddExercise} activeOpacity={0.75}>
                    <Plus size={16} color={FC.coral} strokeWidth={2.5} />
                    <Text style={st.addExText}>{t('addEntry.addExercise', 'Ajouter un exercice')}</Text>
                </TouchableOpacity>
            </View>

            {/* Toggle bloc abdos */}
            <TouchableOpacity style={st.absToggle} onPress={onToggleAbs} activeOpacity={0.75}>
                <View style={[st.checkbox, withAbsBlock && st.checkboxOn]}>
                    {withAbsBlock && <Text style={st.checkmark}>✓</Text>}
                </View>
                <Text style={st.absText}>{t('addEntry.includeAbs', 'Inclure un bloc abdos')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const st = StyleSheet.create({
    durationWrap: {
        width: 88,
    },

    // Builder exercices
    exercisesCard: {
        backgroundColor: FC.surface,
        borderRadius: FR.xxl,
        borderWidth: 1,
        borderColor: FC.border,
        padding: FS.lg,
        marginBottom: FS.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    exercisesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: FS.md,
    },
    exercisesTitle: {
        fontSize: FT.md,
        fontWeight: FW.xbold,
        color: FC.text,
        letterSpacing: -0.2,
    },
    exercisesHeaderActions: {
        flexDirection: 'row',
        gap: FS.sm,
    },
    headerActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: FS.xs,
        paddingHorizontal: FS.md,
        paddingVertical: FS.xs + 1,
        backgroundColor: FC.overlay,
        borderWidth: 1,
        borderColor: FC.border,
        borderRadius: FR.pill,
    },
    headerActionText: {
        fontSize: FT.xs,
        fontWeight: FW.bold,
        color: FC.textMuted,
        letterSpacing: 0.5,
    },
    colLabels: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: FS.sm,
        marginBottom: FS.sm,
        paddingLeft: 32, // aligne avec les inputs (skip le num)
    },
    colLabel: {
        fontSize: FT.micro,
        fontWeight: FW.black,
        color: FC.textMuted,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },

    // Ligne exercice
    exRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: FS.sm,
        marginBottom: FS.sm,
    },
    exNum: {
        width: 22, height: 22,
        borderRadius: FR.pill,
        backgroundColor: FC.coralSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exNumText: {
        fontSize: 10,
        fontWeight: FW.black,
        color: FC.coral,
    },
    exInput: {
        backgroundColor: FC.surfaceUp,
        borderWidth: 1,
        borderColor: FC.border,
        borderRadius: FR.md,
        paddingHorizontal: FS.sm,
        paddingVertical: 10,
        fontSize: FT.sm,
        fontWeight: FW.med,
        color: FC.text,
    },
    exInputSmall: {
        width: 44,
        textAlign: 'center',
    },
    xMark: {
        fontSize: FT.md,
        color: FC.textMuted,
        fontWeight: FW.light,
        width: 12,
        textAlign: 'center',
    },
    removeBtn: {
        width: 32, height: 32,
        borderRadius: FR.md,
        backgroundColor: 'rgba(248,113,113,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.18)',
    },
    addExBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: FS.sm,
        marginTop: FS.md,
        paddingVertical: 12,
        borderRadius: FR.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: FC.coralGlow,
        backgroundColor: FC.coralSoft,
    },
    addExText: {
        fontSize: FT.sm,
        fontWeight: FW.bold,
        color: FC.coral,
    },

    // Abs toggle
    absToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: FS.md,
        paddingVertical: FS.md,
        paddingHorizontal: FS.lg,
        backgroundColor: FC.overlay,
        borderRadius: FR.xl,
        borderWidth: 1,
        borderColor: FC.border,
    },
    checkbox: {
        width: 22, height: 22,
        borderRadius: FR.sm,
        borderWidth: 2,
        borderColor: FC.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxOn: {
        backgroundColor: FC.coral,
        borderColor: FC.coral,
    },
    checkmark: {
        color: '#1a0800',
        fontSize: 12,
        fontWeight: FW.black,
    },
    absText: {
        fontSize: FT.md,
        color: FC.textSub,
        fontWeight: FW.med,
    },
});
