import {expect, test} from 'vitest'
import {canCant} from '.'

test("should return false for a role that doesn't exist", async () => {
  const {can} = canCant({user: {can: ['anything']}})

  expect(await can('guest', 'anything')).toBe(false)
})

test('should inherit permissions from other roles', async () => {
  const {can} = canCant<'guest' | 'user' | 'manager' | 'admin'>({
    guest: {
      can: ['setup', 'user:create']
    },
    user: {
      can: [
        'note:*',
        {
          name: 'user:*',
          when: async ({
            userId,
            targetId
          }: {
            userId: number
            targetId: number
          }) => {
            return userId === targetId
          }
        }
      ]
    },
    manager: {
      can: [
        'user:update',
        'log:create',
        {
          name: 'log:update',
          when: async () => {
            return true
          }
        }
      ],
      inherits: ['user']
    },
    admin: {
      can: ['user:*'],
      inherits: ['user', 'manager']
    }
  })

  expect(await can('guest', 'setup')).toBe(true)
  expect(await can('guest', 'user:create')).toBe(true)
  expect(await can('guest', 'user:view')).toBe(false)
  expect(await can('user', 'user:update', {userId: 1, targetId: 1})).toBe(true)
  expect(await can('user', 'user:update', {userId: 1, targetId: 2})).toBe(false)
  expect(await can('manager', 'user:update', {userId: 1, targetId: 2})).toBe(
    true
  )
  expect(await can('manager', 'note:create')).toBe(true)
  expect(await can('admin', 'log:create')).toBe(true)
  expect(await can('admin', 'note:create')).toBe(true)
  expect(await can('admin', 'log:update')).toBe(true)
})

test('should support cant', async () => {
  const {can} = canCant({
    user: {
      can: [
        {
          name: 'user:*',
          when: async ({
            userId,
            targetId
          }: {
            userId: number
            targetId: number
          }) => {
            return userId === targetId
          }
        }
      ],
      cant: ['user:destroy', 'user:create']
    },
    admin: {
      can: ['user:*']
    }
  })

  expect(await can('user', 'user:update', {userId: 1, targetId: 1})).toBe(true)
  expect(await can('user', 'user:destroy', {userId: 1, targetId: 1})).toBe(
    false
  )
})
