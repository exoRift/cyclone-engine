import * as Oceanic from 'oceanic.js'

import { EffectHandler } from 'modules'

import { RequestEntity } from 'structures/request'
import { ResponseEntity } from 'structures/response'

import {
  AuthLevel,
  EffectEventGroup,
  Promisable
} from 'types'

/**
 * Data pertaining to what triggers an effect
 * @template E The event group
 */
export type Trigger<E extends keyof EffectEventGroup = keyof EffectEventGroup> = {
  [K in keyof EffectEventGroup & E]: {
    /** The event group that triggers this effect type */
    group: K,
    /** That actual events that will trigger this effect instance */
    events: EffectEventGroup[K][]
  }
}[keyof EffectEventGroup & E]

/**
 * The base effect class
 * @namespace Effect
 */
export abstract class Base<E extends keyof EffectEventGroup = keyof EffectEventGroup> {
  /**
   * Convert an AuthLevel into a permission integer
   * @param level The AuthLevel
   * @returns     An integer representation of the permission
   */
  static authToPermission (level: AuthLevel | number | bigint = 0): bigint {
    if (typeof level === 'bigint') return level
    else if (typeof level === 'number') return BigInt(level)

    switch (level) {
      case AuthLevel.MEMBER: return BigInt(0)
      case AuthLevel.ADMIN: case AuthLevel.OWNER: return BigInt(1 << 3)
      default: return BigInt(0)
    }
  }

  /** The events that trigger this effect */
  abstract readonly _trigger: Trigger<E>

  /** The identifer of this effect */
  abstract _identifier: string

  /** Miscellaneous effect options */
  abstract options: {
    /** The authorization level required to use this effect */
    clearance: AuthLevel | number
  }

  /**
   * A hook to run upon the registration of an effect into the effect handler
   * @param handler The effect handler
   */
  async registrationHook? (handler: EffectHandler): Promise<void>

  /**
   * The action to execute on trigger
   * @param   req The request entity
   * @param   res The response entity
   * @returns     Nothing or a string to log from the agent
   */
  abstract action?: (req: RequestEntity<E>, res: ResponseEntity<E>) => Promisable<string | void>

  /**
   * Does a member fulfill the clearance requirements for this effect?
   * @param   user The member
   * @returns      Does the user fulfill the requirements?
   */
  fulfillsAuth (user: Oceanic.Member): boolean {
    const permission = Base.authToPermission(this.options.clearance)

    return this.options.clearance === AuthLevel.OWNER ? user.guild.ownerID === user.id : user.permissions.has(permission)
  }
}
