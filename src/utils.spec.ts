import {test, expect} from 'vitest'

import {isGlob, globToRegex, keys} from './utils'

test('isGlob', () => {
  expect(isGlob('user:*')).toBe(true)
  expect(isGlob('user:destroy')).toBe(false)
})

test('globToRegex', () => {
  expect(globToRegex('user:*')).toStrictEqual(/^user:.*/)
})

test('keys', () => {
  expect(keys({userId: 1, targetId: 2})).toStrictEqual(['userId', 'targetId'])
})
