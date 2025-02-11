export default {
  preset: 'ts-jest',
  testEnvironment: 'jest-fixed-jsdom',
  testTimeout: 30000,
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
