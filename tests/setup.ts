// Jest setup file for API Service Library tests

// Mock localStorage for Node.js environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock sessionStorage for Node.js environment  
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Make storage available globally (only if window exists)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
  });
} else {
  // For Node.js environment
  (global as any).localStorage = localStorageMock;
  (global as any).sessionStorage = sessionStorageMock;
}

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  debug: jest.fn(),
  trace: jest.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

// Increase timeout for integration tests
jest.setTimeout(30000);