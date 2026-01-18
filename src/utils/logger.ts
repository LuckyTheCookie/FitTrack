// ============================================================================
// LOGGER UTILITY - Logging conditionnel pour dev/production
// ============================================================================

/** 
 * Vérifie si on est en mode développement
 * __DEV__ est fourni par React Native/Metro bundler
 */
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
    /** Préfixe à ajouter aux logs */
    prefix?: string;
    /** Afficher les logs même en production (pour error uniquement) */
    forceInProduction?: boolean;
}

/**
 * Logger conditionnel qui ne log qu'en mode développement
 * Utiliser à la place de console.log pour éviter les fuites en production
 */
class Logger {
    private prefix: string;
    private forceInProduction: boolean;

    constructor(options: LoggerOptions = {}) {
        this.prefix = options.prefix ? `[${options.prefix}]` : '';
        this.forceInProduction = options.forceInProduction ?? false;
    }

    private shouldLog(level: LogLevel): boolean {
        if (isDev) return true;
        // En production, ne logguer que les erreurs si forcé
        if (level === 'error' && this.forceInProduction) return true;
        return false;
    }

    private formatMessage(message: string): string {
        return this.prefix ? `${this.prefix} ${message}` : message;
    }

    /** Log de debug - seulement en développement */
    debug(message: string, ...args: unknown[]): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage(message), ...args);
        }
    }

    /** Log d'info - seulement en développement */
    info(message: string, ...args: unknown[]): void {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage(message), ...args);
        }
    }

    /** Warning - seulement en développement */
    warn(message: string, ...args: unknown[]): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage(message), ...args);
        }
    }

    /** Error - loggé même en production si forceInProduction est true */
    error(message: string, ...args: unknown[]): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage(message), ...args);
        }
    }

    /** 
     * Log une fois seulement (pour éviter spam dans les boucles)
     * Utilise un Set pour tracker les messages déjà loggés
     */
    private loggedOnce = new Set<string>();
    
    once(level: LogLevel, key: string, message: string, ...args: unknown[]): void {
        if (this.loggedOnce.has(key)) return;
        this.loggedOnce.add(key);
        
        switch (level) {
            case 'debug': this.debug(message, ...args); break;
            case 'info': this.info(message, ...args); break;
            case 'warn': this.warn(message, ...args); break;
            case 'error': this.error(message, ...args); break;
        }
    }

    /** Créer un sous-logger avec un préfixe additionnel */
    child(prefix: string): Logger {
        const newPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
        return new Logger({ 
            prefix: newPrefix.replace(/^\[|\]$/g, ''), 
            forceInProduction: this.forceInProduction 
        });
    }
}

// ============================================================================
// LOGGERS PRÉ-CONFIGURÉS
// ============================================================================

/** Logger principal de l'app */
export const logger = new Logger({ prefix: 'Spix' });

/** Logger pour les stores */
export const storeLogger = new Logger({ prefix: 'Store' });

/** Logger pour les services */
export const serviceLogger = new Logger({ prefix: 'Service' });

/** Logger pour le rep counter / pose detection */
export const poseLogger = new Logger({ prefix: 'Pose' });

/** Logger pour Health Connect */
export const healthConnectLogger = new Logger({ prefix: 'HealthConnect' });

/** Logger pour les erreurs critiques (toujours loggées) */
export const errorLogger = new Logger({ prefix: 'Error', forceInProduction: true });

/** Créer un logger personnalisé */
export const createLogger = (prefix: string, forceInProduction = false): Logger => {
    return new Logger({ prefix, forceInProduction });
};

export default logger;
