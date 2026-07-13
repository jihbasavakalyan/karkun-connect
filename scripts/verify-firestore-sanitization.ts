import assert from 'node:assert/strict'
import { sanitizeForFirestore } from '@/repositories/firestore/firestoreHelpers'

const sanitized = sanitizeForFirestore({
  name: 'Test',
  whatsapp: undefined,
  fatherHusbandName: undefined,
  nested: {
    keepFalse: false,
    keepZero: 0,
    keepEmpty: '',
    keepNull: null,
    remove: undefined,
  },
  list: [{ a: 1 }, undefined, { b: undefined, c: 'ok' }],
})

assert.deepStrictEqual(sanitized, {
  name: 'Test',
  nested: {
    keepFalse: false,
    keepZero: 0,
    keepEmpty: '',
    keepNull: null,
  },
  list: [{ a: 1 }, { c: 'ok' }],
})

console.log('Firestore sanitization regression check passed')
