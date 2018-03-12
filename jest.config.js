module.exports = {
  setupFiles: [],
  transform: {
    '^.+\\.ts$': './node_modules/ts-jest/preprocessor.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/zeisslets/'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
};
