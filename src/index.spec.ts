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

test('should break out arrays on names', async () => {
  const {can} = canCant({
    user: {
      can: [
        {
          name: ['user:*', 'note:*'],
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
      cant: [
        {
          name: ['admin:*', 'user:destory'],
          when: async () => {
            return true
          }
        },
        'auth:*'
      ]
    }
  })

  expect(await can('user', 'user:update', {userId: 1, targetId: 1})).toBe(true)
  expect(await can('user', 'note:update', {userId: 1, targetId: 1})).toBe(true)
  expect(await can('user', 'admin:dashboard')).toBe(false)
})

test('it should memoize the can function', async () => {
  let count = 0

  const {can} = canCant({
    user: {
      can: [
        {
          name: 'user:*',
          when: async () => {
            count += 1

            return true
          }
        }
      ]
    }
  })

  expect(count).toBe(0)
  expect(await can('user', 'user:create')).toBe(true)
  expect(count).toBe(1)
  expect(await can('user', 'user:create')).toBe(true)
  expect(count).toBe(1)
})

test('should take an array of operatoins', async () => {
  const {can} = canCant({
    user: {
      can: ['login', 'dashboard', 'logout']
    }
  })

  expect(await can('user', ['login', 'dashboard'])).toBe(true)
  expect(await can('user', ['login', 'user:update'])).toBe(false)
  expect(await can('user', ['user:create', 'user:update'])).toBe(false)
})
