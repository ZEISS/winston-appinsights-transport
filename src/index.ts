import * as TransportStream from 'winston-transport';
import * as ai from 'applicationinsights';

export interface AppInsightsCustomFields {
  [key: string]: string;
}

export interface AppInsightsOptions {
  instrumentationKey: string;
  customFields?: AppInsightsCustomFields;
}

export enum Levels {
  fatal = 0,
  error = 1,
  warn = 2,
  info = 3,
  debug = 4,
}

export const getApplicationInsightsSeverity = (level: string): ai.Contracts.SeverityLevel => {
  switch (level) {
    case Levels[Levels.debug]:
      return ai.Contracts.SeverityLevel.Verbose;
    case Levels[Levels.info]:
      return ai.Contracts.SeverityLevel.Information;
    case Levels[Levels.warn]:
      return ai.Contracts.SeverityLevel.Warning;
    case Levels[Levels.error]:
      return ai.Contracts.SeverityLevel.Error;
    case Levels[Levels.fatal]:
      return ai.Contracts.SeverityLevel.Critical;
    default:
      throw new Error(`No severity level found for '${level}'. Please make sure to implement a case in the index.ts.`);
  }
};

export class AppInsightsTransport extends TransportStream {
  private client: ai.TelemetryClient;
  private customFields: AppInsightsCustomFields;

  constructor({ instrumentationKey, customFields, ...options }: AppInsightsOptions & TransportStream.TransportOptions) {
    super(options);

    // We disabled auto collecting exceptions and requests because we need to inject the request id manually
    ai
      .setup(instrumentationKey)
      .setAutoCollectConsole(false)
      .setAutoCollectExceptions(false)
      .setAutoCollectRequests(false)
      .setAutoDependencyCorrelation(false) // this is needed because otherwise winston + AI + pm2 crashes for unknown reasons...
      .start();

    this.client = ai.defaultClient;
    this.customFields = customFields;

    this.handleUnhandledErrors();
  }

  private handleUnhandledErrors() {
    const unhandledError = (exception: Error) => {
      this.client.trackException({
        exception,
        properties: this.customFields,
      });

      throw exception;
    };

    //process.on('uncaughtException', unhandledError); // hack to fix the crashes...
    process.on('unhandledRejection', unhandledError);
  }

  log({ message, level, ...properties }: TransportStream.TransportLogInfo, callback: Function) {
    const overwritteCustomFields = Object.keys(properties).reduce(
      (acc, key) => (Object.keys(this.customFields).includes(key) ? [...acc, key] : acc),
      [],
    );

    if (overwritteCustomFields.length) {
      this.client.trackTrace({
        message: `Predefined transport custom fields have overwritten: '${overwritteCustomFields.join(', ')}'`,
        severity: getApplicationInsightsSeverity(Levels[Levels.warn]),
        properties: this.customFields,
      });
    }

    this.client.trackTrace({
      message: message,
      severity: getApplicationInsightsSeverity(level),
      properties: { ...properties, ...this.customFields },
    });

    return callback(null);
  }
}
