import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  }
}))

// Mock LINE LIFF
jest.mock('@line/liff', () => ({
  init: jest.fn().mockResolvedValue(undefined),
  isLoggedIn: jest.fn().mockReturnValue(true),
  getProfile: jest.fn().mockResolvedValue({
    userId: 'test-user-id',
    displayName: 'Test User'
  }),
  closeWindow: jest.fn(),
}))

// Suppress console warnings during tests
const originalWarn = console.warn
beforeAll(() => {
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
})