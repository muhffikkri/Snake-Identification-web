export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const COLORS: Record<LogLevel, string> = {
  INFO: '#2ECC40',
  WARN: '#FF851B',
  ERROR: '#FF4136'
};

class StructuredLogger {
  log(level: LogLevel, component: string, message: string, metadata?: any) {
    console.log(
      `%c[${new Date().toISOString()}] [${level}] [${component}] %c${message}`,
      `color: ${COLORS[level]}; font-weight: bold;`,
      'color: inherit;',
      metadata || ''
    );
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
}

export const logger = new StructuredLogger();