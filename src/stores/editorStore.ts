import { create } from 'zustand';
import type { Entry } from '../types';

interface EditorState {
    entryToEdit: Entry | null;
    setEntryToEdit: (entry: Entry | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
    entryToEdit: null,
    setEntryToEdit: (entry) => set({ entryToEdit: entry }),
}));
