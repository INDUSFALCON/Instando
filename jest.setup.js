/* eslint-env jest */
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(() => Promise.resolve('')),
  setString: jest.fn(),
  hasString: jest.fn(() => Promise.resolve(true)),
}));

const mockStorage = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key, value) => {
    mockStorage[key] = value;
    return Promise.resolve(null);
  }),
  getItem: jest.fn((key) => {
    return Promise.resolve(mockStorage[key] || null);
  }),
  removeItem: jest.fn((key) => {
    delete mockStorage[key];
    return Promise.resolve(null);
  }),
  clear: jest.fn(() => {
    for (const k in mockStorage) delete mockStorage[k];
    return Promise.resolve(null);
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
}));
