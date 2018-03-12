import { getApplicationInsightsSeverity, Levels } from './index';
import { Contracts } from 'applicationinsights';

describe('getApplicationInsightsSeverity', () => {
  it('should return the verbose severity for the debug level', () => {
    expect(getApplicationInsightsSeverity(Levels[Levels.debug])).toBe(Contracts.SeverityLevel.Verbose);
  });

  it('should return the verbose severity for the info level', () => {
    expect(getApplicationInsightsSeverity(Levels[Levels.info])).toBe(Contracts.SeverityLevel.Information);
  });

  it('should return the warning severity for the warn level', () => {
    expect(getApplicationInsightsSeverity(Levels[Levels.warn])).toBe(Contracts.SeverityLevel.Warning);
  });

  it('should return error severity for the error level', () => {
    expect(getApplicationInsightsSeverity(Levels[Levels.error])).toBe(Contracts.SeverityLevel.Error);
  });

  it('should return critical severity for the fatal level', () => {
    expect(getApplicationInsightsSeverity(Levels[Levels.fatal])).toBe(Contracts.SeverityLevel.Critical);
  });

  it('should thrown an error if an unknown level has been passed in', () => {
    expect(() => getApplicationInsightsSeverity('unknown')).toThrow();
  });
});
