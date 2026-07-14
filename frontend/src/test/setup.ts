import '@testing-library/jest-dom/vitest'

type StorageRecord = Record<string, string>

function createStorageMock(): Storage {
  let store: StorageRecord = {}

  return {
    get length() {
      return Object.keys(store).length
    },
    clear() {
      store = {}
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null
    },
    removeItem(key: string) {
      delete store[key]
    },
    setItem(key: string, value: string) {
      store[key] = value
    },
  }
}

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: createStorageMock(),
})
