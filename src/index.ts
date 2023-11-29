import memoize from 'memoizee'

import {globToRegex, isGlob, keys} from './utils'

// Params could be anything, you could just pass a string if you wanted to.
// eslint-disable-next-line
export type WhenFunction = (params: any) => Promise<boolean>
export type Can = string | {name: string | string[]; when: WhenFunction}

export type ACL<Roles extends string> = {
  [Role in Roles]: ACLEntry<Roles>
}

export type ACLEntry<Roles extends string> = {
  can: Array<Can>
  cant?: Array<Can>
  inherits?: Roles[]
}

type RoleObject = {
  can: {[operation: string]: boolean | WhenFunction}
  canGlob: {name: RegExp; original: string}[]
  cant: {[operation: string]: boolean | WhenFunction}
  cantGlob: {name: RegExp; original: string}[]
  inherits?: string[]
}

export const canCant = <Roles extends string>(data: ACL<Roles>) => {
  const acl: {[role: string]: RoleObject} = {}

  keys(data).forEach(role => {
    const roleObject: RoleObject = {
      can: {},
      canGlob: [],
      cant: {},
      cantGlob: [],
      inherits: data[role].inherits
    }

    data[role].can.forEach(entry => {
      if (typeof entry === 'string') {
        roleObject.can[entry] = true

        if (isGlob(entry)) {
          roleObject.canGlob.push({name: globToRegex(entry), original: entry})
        }
      } else {
        const {name, when} = entry

        ;([] as string[]).concat(name).forEach(n => {
          roleObject.can[n] = when

          if (isGlob(n)) {
            roleObject.canGlob.push({name: globToRegex(n), original: n})
          }
        })
      }
    })

    if (data[role].cant) {
      data[role].cant!.forEach(entry => {
        if (typeof entry === 'string') {
          roleObject.cant[entry] = true

          if (isGlob(entry)) {
            roleObject.cantGlob.push({
              name: globToRegex(entry),
              original: entry
            })
          }
        } else {
          const {name, when} = entry

          ;([] as string[]).concat(name).forEach(n => {
            roleObject.cant[n] = when

            if (isGlob(n)) {
              roleObject.cantGlob.push({name: globToRegex(n), original: n})
            }
          })
        }
      })
    }

    acl[role] = roleObject
  })

  const processList = async (
    role: string,
    staticListName: keyof RoleObject,
    globListName: keyof RoleObject,
    operation: string,
    params?: object
  ) => {
    const staticList = acl[role][staticListName]! as RoleObject['can']
    const globList = acl[role][globListName]! as RoleObject['canGlob']

    if (Object.prototype.hasOwnProperty.call(staticList, operation)) {
      const rule = staticList[operation]

      if (typeof rule === 'boolean') {
        return rule
      }

      return await rule(params ? params : {})
    }

    const match = globList.reduce(
      (m, {name, original}) => {
        if (m !== undefined) return m

        if (name.test(operation)) {
          return original
        }

        return undefined
      },
      undefined as undefined | string
    )

    if (match) {
      return can(role, match, params)
    }
  }

  const canFn = async (
    role: string,
    operation: string,
    params?: object
  ): Promise<boolean> => {
    if (!acl[role]) {
      return false
    }

    const cantResult = await processList(
      role,
      'cant',
      'cantGlob',
      operation,
      params
    )

    if (cantResult) {
      return false
    }

    const canResult = await processList(
      role,
      'can',
      'canGlob',
      operation,
      params
    )

    if (canResult) {
      return true
    }

    if (acl[role].inherits) {
      const inheritedRolePromises: Promise<boolean>[] = []

      acl[role].inherits!.forEach(inheritedRole => {
        inheritedRolePromises.push(can(inheritedRole, operation, params))
      })

      const results = await Promise.all(inheritedRolePromises)

      return results.reduce((c, v) => {
        if (c) {
          return true
        }

        return v
      }, false)
    }

    return false
  }

  const can = memoize(canFn, {promise: true})

  return {can}
}
