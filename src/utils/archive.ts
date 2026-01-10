// ============================================================================
// ARCHIVE UTILS - Gestion de l'archivage des vieilles données
// ============================================================================

import { Entry } from '../types';
import { 
    ARCHIVE_THRESHOLD_DAYS, 
    MIN_ENTRIES_TO_KEEP,
    MAX_ENTRIES_BEFORE_ARCHIVE_WARNING,
} from '../constants/values';
import { storeLogger } from './logger';

/**
 * Résultat de l'analyse d'archivage
 */
export interface ArchiveAnalysis {
    /** Nombre total d'entrées */
    totalEntries: number;
    /** Nombre d'entrées éligibles à l'archivage (plus vieilles que le seuil) */
    archivableCount: number;
    /** Nombre d'entrées qui seraient gardées après archivage */
    keepCount: number;
    /** Date de la plus ancienne entrée */
    oldestEntryDate: string | null;
    /** Date de la plus récente entrée archivable */
    newestArchivableDate: string | null;
    /** Si l'archivage est recommandé */
    shouldArchive: boolean;
    /** Message explicatif */
    message: string;
}

/**
 * Résultat de l'opération d'archivage
 */
export interface ArchiveResult {
    /** Entrées à conserver (récentes) */
    keptEntries: Entry[];
    /** Entrées archivées (anciennes) */
    archivedEntries: Entry[];
    /** Nombre d'entrées archivées */
    archivedCount: number;
    /** Période couverte par l'archive (format: "Jan 2024 - Dec 2024") */
    archivePeriod: string;
}

/**
 * Calcule la date limite pour l'archivage (aujourd'hui - ARCHIVE_THRESHOLD_DAYS)
 */
export const getArchiveThresholdDate = (): Date => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - ARCHIVE_THRESHOLD_DAYS);
    threshold.setHours(0, 0, 0, 0);
    return threshold;
};

/**
 * Convertit une date YYYY-MM-DD en objet Date
 */
const parseEntryDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Formate une période en texte lisible
 */
const formatPeriod = (startDate: string, endDate: string): string => {
    const start = parseEntryDate(startDate);
    const end = parseEntryDate(endDate);
    
    const startMonth = start.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    const endMonth = end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    
    return startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
};

/**
 * Analyse les entrées pour déterminer si un archivage est recommandé
 * 
 * Règles:
 * - Archivage suggéré si > MAX_ENTRIES_BEFORE_ARCHIVE_WARNING entrées
 * - OU si > MIN_ENTRIES_TO_KEEP entrées + entrées vieilles de > ARCHIVE_THRESHOLD_DAYS jours
 * - On archive les entrées plus vieilles que ARCHIVE_THRESHOLD_DAYS
 * - On garde toujours au moins MIN_ENTRIES_TO_KEEP entrées
 */
export const analyzeArchivable = (entries: Entry[]): ArchiveAnalysis => {
    if (entries.length === 0) {
        return {
            totalEntries: 0,
            archivableCount: 0,
            keepCount: 0,
            oldestEntryDate: null,
            newestArchivableDate: null,
            shouldArchive: false,
            message: 'Aucune entrée à archiver',
        };
    }

    const threshold = getArchiveThresholdDate();
    const thresholdStr = threshold.toISOString().split('T')[0];

    // Trier par date (plus récent en premier)
    const sortedEntries = [...entries].sort((a, b) => 
        b.date.localeCompare(a.date)
    );

    // Identifier les entrées archivables (plus vieilles que le seuil)
    const archivableEntries = sortedEntries.filter(e => e.date < thresholdStr);
    const recentEntries = sortedEntries.filter(e => e.date >= thresholdStr);

    const archivableCount = archivableEntries.length;
    const keepCount = recentEntries.length;
    
    const oldestEntryDate = sortedEntries.length > 0 
        ? sortedEntries[sortedEntries.length - 1].date 
        : null;
    
    const newestArchivableDate = archivableEntries.length > 0 
        ? archivableEntries[0].date 
        : null;

    // Déterminer si on devrait suggérer l'archivage
    let shouldArchive = false;
    let message = '';

    if (entries.length > MAX_ENTRIES_BEFORE_ARCHIVE_WARNING) {
        shouldArchive = archivableCount > 0;
        message = shouldArchive 
            ? `Tu as ${entries.length} entrées. Archiver ${archivableCount} entrées de plus d'un an libérerait de l'espace.`
            : `Tu as ${entries.length} entrées mais aucune n'a plus d'un an.`;
    } else if (archivableCount > MIN_ENTRIES_TO_KEEP) {
        shouldArchive = true;
        message = `${archivableCount} entrées datent de plus d'un an et peuvent être archivées.`;
    } else if (archivableCount > 0) {
        shouldArchive = false;
        message = `${archivableCount} entrées anciennes, mais pas assez pour suggérer l'archivage.`;
    } else {
        message = 'Toutes tes entrées datent de moins d\'un an, rien à archiver.';
    }

    storeLogger.debug(`[Archive] Analysis: ${entries.length} total, ${archivableCount} archivable, shouldArchive=${shouldArchive}`);

    return {
        totalEntries: entries.length,
        archivableCount,
        keepCount,
        oldestEntryDate,
        newestArchivableDate,
        shouldArchive,
        message,
    };
};

/**
 * Sépare les entrées en deux groupes: à conserver et à archiver
 * 
 * @param entries - Toutes les entrées
 * @returns Objet avec les entrées à garder et celles à archiver
 */
export const separateForArchive = (entries: Entry[]): ArchiveResult => {
    if (entries.length === 0) {
        return {
            keptEntries: [],
            archivedEntries: [],
            archivedCount: 0,
            archivePeriod: '',
        };
    }

    const threshold = getArchiveThresholdDate();
    const thresholdStr = threshold.toISOString().split('T')[0];

    // Trier par date (plus récent en premier)
    const sortedEntries = [...entries].sort((a, b) => 
        b.date.localeCompare(a.date)
    );

    // Séparer récentes vs archivables
    const keptEntries = sortedEntries.filter(e => e.date >= thresholdStr);
    const archivedEntries = sortedEntries.filter(e => e.date < thresholdStr);

    // Calculer la période de l'archive
    let archivePeriod = '';
    if (archivedEntries.length > 0) {
        const oldestDate = archivedEntries[archivedEntries.length - 1].date;
        const newestDate = archivedEntries[0].date;
        archivePeriod = formatPeriod(oldestDate, newestDate);
    }

    storeLogger.debug(`[Archive] Separated: ${keptEntries.length} kept, ${archivedEntries.length} archived`);

    return {
        keptEntries,
        archivedEntries,
        archivedCount: archivedEntries.length,
        archivePeriod,
    };
};

/**
 * Génère un nom de fichier pour l'archive
 */
export const generateArchiveFilename = (period: string): string => {
    const date = new Date().toISOString().split('T')[0];
    const safePeriod = period.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    return `fittrack-archive-${safePeriod}-${date}.json`;
};

/**
 * Calcule les statistiques résumées d'une liste d'entrées archivées
 */
export const calculateArchiveStats = (entries: Entry[]) => {
    const sportEntries = entries.filter(e => 
        e.type === 'home' || e.type === 'run' || e.type === 'beatsaber'
    );
    
    const mealEntries = entries.filter(e => e.type === 'meal');
    const measureEntries = entries.filter(e => e.type === 'measure');

    let totalReps = 0;
    let totalDistanceKm = 0;
    let totalDurationMinutes = 0;

    for (const entry of sportEntries) {
        if (entry.type === 'home' && 'totalReps' in entry) {
            totalReps += entry.totalReps ?? 0;
        }
        if (entry.type === 'run' && 'distanceKm' in entry) {
            totalDistanceKm += entry.distanceKm ?? 0;
        }
        if ('durationMinutes' in entry) {
            totalDurationMinutes += entry.durationMinutes ?? 0;
        }
    }

    return {
        totalEntries: entries.length,
        sportWorkouts: sportEntries.length,
        meals: mealEntries.length,
        measures: measureEntries.length,
        totalReps,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        totalDurationMinutes,
    };
};
