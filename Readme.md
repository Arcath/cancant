# CanCant

[![validate](https://github.com/Arcath/cancant/actions/workflows/main.yml/badge.svg)](https://github.com/Arcath/cancant/actions/workflows/main.yml)

CanCant is a RBAC permissions system in the style of
[easy-rbac](https://github.com/DeadAlready/easy-rbac) that supports wildcards
and _can't/deny_ operations.

## Usage

Install from npm as

```bash
npm install --save cancant
```

Create a file to store your permissions in, it will need to be imported anywhere
you want to use the _can_ function.

```ts
import {canCant} from 'cancant'

const {can} = canCant({
  guest: {
    can: ['login']
  },
  user: {
    can: [
      'logout',
      {
        name: 'user:*',
        when: async ({userId, targetId}) => {
          return userId === targetId
        }
      }
    ],
    cant: [
      'user:create',
      'user:destroy'
    ]
  },
  admin: {
    can: ['user:*']
    inherits: ['user']
  }
})

can('user', 'logout') // `true`, 'logout' is in the can list
can('user', 'user:update', {userId: 1, targetId: 1}) // `true` the `when` function checks that `userId` matches `targetId`
can('user', 'user:update', {userId: 1, targetId: 2}) // `false` the `when` function returns `false`
can('user', 'admin:update', {userId: 1, targetId: 2}) // `true` admins have 'user:*'
can('user', 'admin:logout') // `true` admins inherit permissions from 'user'
```

## Defining a Role

When defining a role to cancant you pass an object with the following
properties:

| Property   | Required | Contains                              |
| :--------- | :------: | :------------------------------------ |
| `can`      |   Yes    | Array of _Cans_.                      |
| `cant`     |    No    | Array of _Cans_ to be used inversely. |
| `inherits` |    No    | Array of roles to inherit from.       |

## Definin a Can

_Cans_ can be either a string that set a permission to true, e.g. `user:create`
or `user:*`, or an object where `name` works the same a single string, and
`when` is a function that returns true/false for if the user can.

```js
can: [
  'logout',
  {
    name: 'user:*',
    when: async ({userId, targetId}) => {
      return userId === targetId
    }
  }
]
```

The same is true for `cant` however a `true` here makes the overall `can`
function return false.
