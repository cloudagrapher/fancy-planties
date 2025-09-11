// Mock for oslo package to handle ES module issues in Jest
// This provides mock implementations for crypto functions used in tests

export const generateRandomString = (length, alphabet) => {
  return 'mock-random-string-' + length;
};

export const generateId = (length) => {
  return 'mock-id-' + (length || 15);
};

export const encodeBase32 = (data) => {
  return 'MOCK' + Buffer.from(data).toString('base64').replace(/=/g, '');
};

export const decodeBase32 = (encoded) => {
  const base64 = encoded.replace('MOCK', '') + '==';
  return Buffer.from(base64, 'base64');
};

export const encodeHex = (data) => {
  return Buffer.from(data).toString('hex');
};

export const decodeHex = (encoded) => {
  return Buffer.from(encoded, 'hex');
};

// Export all functions as default for different import patterns
export default {
  generateRandomString,
  generateId,
  encodeBase32,
  decodeBase32,
  encodeHex,
  decodeHex
};

// Handle crypto module exports
export const crypto = {
  generateRandomString,
  generateId
};

// Handle password module exports 
export const password = {
  hash: async (password) => 'mock-hash-' + password,
  verify: async (hash, password) => hash === 'mock-hash-' + password
};

// Mock ECDSA if needed
export const ECDSA = {
  sign: () => 'mock-signature',
  verify: () => true
};