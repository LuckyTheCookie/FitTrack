// ============================================================================
// UTILITAIRES DE DATE - Spix App
// ============================================================================

import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isToday,
  isSameDay,
  parseISO,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  subWeeks,
  subMonths,
} from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import i18n from '../i18n';

const getDateLocale = () => {
  return i18n.language === 'fr' ? fr : enUS;
}

// Obtenir la date du jour au format YYYY-MM-DD
export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// Obtenir l'ISO string actuel
export function getNowISO(): string {
  return new Date().toISOString();
}

// Parser une date string
export function parseDate(dateString: string): Date {
  return parseISO(dateString);
}

// Formater pour affichage
export function formatDisplayDate(dateString: string): string {
  return format(parseISO(dateString), 'd MMM yyyy', { locale: getDateLocale() });
}

export function formatShortDate(dateString: string): string {
  return format(parseISO(dateString), 'd MMM', { locale: getDateLocale() });
}

export function formatTime(isoString: string): string {
  return format(parseISO(isoString), 'HH:mm');
}

// Semaine courante
export function getCurrentWeekStart(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 }); // Lundi
}

export function getCurrentWeekEnd(): Date {
  return endOfWeek(new Date(), { weekStartsOn: 1 }); // Dimanche
}

export function getWeekDateStrings(): string[] {
  const start = getCurrentWeekStart();
  return Array.from({ length: 7 }, (_, i) => 
    format(addDays(start, i), 'yyyy-MM-dd')
  );
}

// Jours de la semaine pour affichage
export interface DayInfo {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // LUN, MAR, etc.
  dayNumber: number;
  isToday: boolean;
}

export function getWeekDaysInfo(): DayInfo[] {
  const start = getCurrentWeekStart();
  const isFr = i18n.language === 'fr';
  const daysShort = isFr ? ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayOfWeek: daysShort[i],
      dayNumber: date.getDate(),
      isToday: isToday(date),
    };
  });
}

// Vérifier si une date est dans la semaine courante
export function isInCurrentWeek(dateString: string): boolean {
  const date = parseISO(dateString);
  const start = getCurrentWeekStart();
  const end = getCurrentWeekEnd();
  return date >= start && date <= end;
}

// Calcul du streak
export function calculateStreak(activityDates: string[]): { current: number; best: number } {
  if (activityDates.length === 0) {
    return { current: 0, best: 0 };
  }

  // Enlever les doublons et trier par ordre croissant (ancien -> récent)
  const uniqueDates = Array.from(new Set(activityDates)).sort((a, b) => a.localeCompare(b));

  const today = getTodayDateString();
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');

  // Set pour lookup rapide
  const dateSet = new Set(uniqueDates);

  // --- Calcul du streak courant (doit se terminer aujourd'hui ou hier) ---
  let current = 0;
  let dayToCheck = today;

  if (dateSet.has(dayToCheck)) {
    while (dateSet.has(dayToCheck)) {
      current++;
      dayToCheck = format(addDays(parseISO(dayToCheck), -1), 'yyyy-MM-dd');
    }
  } else if (dateSet.has(yesterday)) {
    dayToCheck = yesterday;
    while (dateSet.has(dayToCheck)) {
      current++;
      dayToCheck = format(addDays(parseISO(dayToCheck), -1), 'yyyy-MM-dd');
    }
  }

  // --- Calcul du meilleur streak (n'importe où dans l'historique) ---
  let best = 0;
  let run = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = parseISO(uniqueDates[i - 1]);
    const curr = parseISO(uniqueDates[i]);

    if (differenceInDays(curr, prev) === 1) {
      run++;
    } else {
      best = Math.max(best, run);
      run = 1;
    }
  }

  best = Math.max(best, run, current);

  return { current, best };
}

// Obtenir les dates de la semaine pour export
export function getWeekExportRange(): { start: string; end: string } {
  return {
    start: format(getCurrentWeekStart(), 'yyyy-MM-dd'),
    end: format(getCurrentWeekEnd(), 'yyyy-MM-dd'),
  };
}

// Stats par mois (6 derniers mois)
export function getLastSixMonths(): string[] {
  const result: string[] = [];
  for (let i = 0; i < 6; i++) {
    result.push(format(subMonths(new Date(), i), 'yyyy-MM'));
  }
  return result.reverse();
}

export function getMonthName(monthString: string): string {
  const date = parseISO(`${monthString}-01`);
  return format(date, 'MMMM yyyy', { locale: getDateLocale() });
}

export function getShortMonthName(monthString: string): string {
  const date = parseISO(`${monthString}-01`);
  return format(date, 'MMM', { locale: getDateLocale() });
}

// Nombre de jours dans un mois
export function getDaysInMonth(monthString: string): number {
  const date = parseISO(`${monthString}-01`);
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return differenceInDays(end, start) + 1;
}

// Relative time

export function getRelativeTime(isoString: string): string {
  const date = parseISO(isoString);
  const today = new Date();
  
  // Compare dates by day only (not time)
  const dateDay = format(date, 'yyyy-MM-dd');
  const todayDay = format(today, 'yyyy-MM-dd');
  const yesterdayDay = format(addDays(today, -1), 'yyyy-MM-dd');
  
  if (dateDay === todayDay) return i18n.t('home.today');
  if (dateDay === yesterdayDay) return i18n.t('home.yesterday');
  
  const diffDays = differenceInDays(today, date);
  
  if (diffDays < 7) return i18n.t('home.daysAgo', { count: diffDays });
  if (diffDays < 30) return i18n.t('home.weeksAgo', { count: Math.floor(diffDays / 7) });
  return formatShortDate(isoString);
}
