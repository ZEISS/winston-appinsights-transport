declare module 'winston-transport' {
  class TransportStream {
    constructor(opts: TransportStream.TransportOptions);
    log(log: TransportStream.TransportLogInfo, callback: Function): void;
  }

  namespace TransportStream {
    export interface TransportOptions {
      level: string;
      handleExceptions: boolean;
      log: TransportLogInterface;
      close: () => void;
    }

    export interface TransportLogInfo {
      message: string;
      level: string;
      [x: string]: string;
    }

    export interface TransportLogInterface {
      (log: TransportStream.TransportLogInfo, callback: Function): void;
    }
  }

  export = TransportStream;
}
