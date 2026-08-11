export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: any;
}

const STORAGE_KEY = 'snakebite_structured_logs';

class StructuredLogger {
  private getLogsFromStorage(): LogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading logs from storage', e);
      return [];
    }
  }

  private saveLogsToStorage(logs: LogEntry[]) {
    try {
      // Keep only the last 100 logs to prevent overflow
      const trimmed = logs.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error saving logs to storage', e);
    }
  }

  log(level: LogLevel, component: string, message: string, metadata?: any) {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      level,
      component,
      message,
      metadata
    };

    // Print to browser console with stylized formatting
    const color = level === 'ERROR' ? '#FF4136' : level === 'WARN' ? '#FF851B' : '#2ECC40';
    console.log(
      `%c[${new Date(entry.timestamp).toISOString()}] [${level}] [${component}] %c${message}`,
      `color: ${color}; font-weight: bold;`,
      'color: inherit;',
      metadata || ''
    );

    const logs = this.getLogsFromStorage();
    logs.push(entry);
    this.saveLogsToStorage(logs);
    
    // Dispatch custom event so that components can listen and re-render logs in real-time
    window.dispatchEvent(new CustomEvent('snakebite_log_added', { detail: entry }));
  }

  info(component: string, message: string, metadata?: any) {
    this.log('INFO', component, message, metadata);
  }

  warn(component: string, message: string, metadata?: any) {
    this.log('WARN', component, message, metadata);
  }

  error(component: string, message: string, metadata?: any) {
    this.log('ERROR', component, message, metadata);
  }

  getLogs(): LogEntry[] {
    return this.getLogsFromStorage();
  }

  clearLogs() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('snakebite_logs_cleared'));
  }
}

export const logger = new StructuredLogger();
