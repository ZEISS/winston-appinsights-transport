import * as TransportStream from 'winston-transport';
import * as ai from 'applicationinsights';

export interface AppInsightsCustomFields {
  [key: string]: any;
}

export interface AppInsightsOptions {
  instrumentationKey: string;
  customFields?: AppInsightsCustomFields;
  clientOptions?: ClientOptions;
}

export interface ClientOptions {
  maxBatchIntervalMs?: number;
  useDiskRetryCaching?: boolean;
}

export interface AppInsightsRequest {
  name: string;
  url: string;
  source?: string;
  duration: number;
  resultCode: string | number;
  success: boolean;
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

export interface TransportLogInfo {
  message: string;
  level: string;
  [x: string]: string;
}

export class AppInsightsTransport extends TransportStream {
  private client: ai.TelemetryClient;
  private customFields: AppInsightsCustomFields;

  constructor({
    instrumentationKey,
    customFields,
    clientOptions,
    ...options
  }: AppInsightsOptions & TransportStream.TransportStreamOptions) {
    super(options);

    // We disabled auto collecting exceptions and requests because we need to inject the request id manually
    ai.setup(instrumentationKey)
      .setAutoCollectConsole(false)
      .setAutoCollectExceptions(false)
      .setAutoCollectRequests(false)
      .setAutoDependencyCorrelation(false) // this is needed because otherwise winston + AI + pm2 crashes for unknown reasons...
      .setUseDiskRetryCaching(clientOptions ? clientOptions.useDiskRetryCaching : true)
      .start();

    this.client = ai.defaultClient;
    if (clientOptions && clientOptions.maxBatchIntervalMs) {
      this.client.config.maxBatchIntervalMs = clientOptions.maxBatchIntervalMs;
    }
    if (customFields && customFields.serviceName) {
      this.client.context.tags[ai.defaultClient.context.keys.cloudRole] = customFields.serviceName;
    }
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

    process.on('uncaughtException', unhandledError);
    process.on('unhandledRejection', unhandledError);
  }

  log({ message, level, ...properties }: TransportLogInfo, callback: () => void) {
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

    if (properties.url) {
      const { name, url, duration, resultCode, success, source, ...customFields } = properties;

      this.client.trackRequest({
        name: properties.name,
        url: properties.url,
        duration: parseInt(properties.duration, 10),
        resultCode: properties.resultCode,
        success: !!properties.success,
        source: properties.source,
        properties: { ...customFields, ...this.customFields },
      });
    } else {
      this.client.trackTrace({
        message: message,
        severity: getApplicationInsightsSeverity(level),
        properties: { ...properties, ...this.customFields },
      });
    }

    return callback();
  }
}
