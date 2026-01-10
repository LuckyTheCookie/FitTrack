// ============================================================================
// ERROR BOUNDARY - React error boundary for graceful error handling
// ============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants';
import { errorLogger } from '../utils/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the app.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary onError={(error) => logError(error)}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log the error to our error logger
        errorLogger.error('ErrorBoundary caught an error:', error);
        errorLogger.error('Component stack:', errorInfo.componentStack);

        // Update state with error info
        this.setState({ errorInfo });

        // Call optional onError callback
        this.props.onError?.(error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        this.props.onReset?.();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <AlertTriangle size={64} color={Colors.error} />
                        </View>
                        
                        <Text style={styles.title}>Oups ! Une erreur est survenue</Text>
                        <Text style={styles.subtitle}>
                            L'application a rencontré un problème inattendu.
                        </Text>

                        {__DEV__ && this.state.error && (
                            <ScrollView style={styles.errorDetails} showsVerticalScrollIndicator={false}>
                                <Text style={styles.errorTitle}>
                                    {this.state.error.name}: {this.state.error.message}
                                </Text>
                                {this.state.errorInfo && (
                                    <Text style={styles.errorStack}>
                                        {this.state.errorInfo.componentStack}
                                    </Text>
                                )}
                            </ScrollView>
                        )}

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity 
                                style={styles.button} 
                                onPress={this.handleReset}
                                activeOpacity={0.8}
                            >
                                <RefreshCw size={20} color="#fff" />
                                <Text style={styles.buttonText}>Réessayer</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.hint}>
                            Si le problème persiste, essayez de redémarrer l'application.
                        </Text>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `${Colors.error}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    errorDetails: {
        maxHeight: 200,
        width: '100%',
        backgroundColor: Colors.cardSolid,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
    },
    errorTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.error,
        marginBottom: Spacing.sm,
    },
    errorStack: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        fontFamily: 'monospace',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.cta,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    buttonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: '#fff',
    },
    hint: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
    },
});

export default ErrorBoundary;
