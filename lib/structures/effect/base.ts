import * as Oceanic from 'oceanic.js'

import { EffectHandler } from '../../modules'

import { RequestType } from '../request'
import { Origin } from '../response'

import {
  Action,
  AuthLevel,
  EffectEventGroup
} from '../../types'

/**
 * Data pertaining to what triggers an effect
 * @template E The event group
 */
export type Trigger<E extends keyof EffectEventGroup = keyof EffectEventGroup> = {
  [K in keyof EffectEventGroup]: {
    /** The event group that triggers this effect type */
    group: K
    /** That actual events that will trigger this effect instance */
    events: Array<EffectEventGroup[K]>
  }
}[E]

export interface EffectData<E extends keyof EffectEventGroup = keyof EffectEventGroup> {
  /** Actions that can be referenced statically by components (These are persistent through bot restarts) */
  subactions?: Record<string, Action<E, RequestType.SUBACTION>>
}

/**
 * The base effect class
 * @namespace Effect
 */
export abstract class Base<E extends keyof EffectEventGroup = keyof EffectEventGroup> implements Required<EffectData<E>> {
  /**
   * Convert an AuthLevel into a permission integer
   * @param   level The AuthLevel
   * @returns       An integer representation of the permission
   */
  static authToPermission (level: AuthLevel | number | bigint = 0): bigint {
    if (typeof level === 'bigint') return level
    else if (typeof level === 'number') return BigInt(level)

    switch (level) {
      case AuthLevel.MEMBER: return 0n
      case AuthLevel.ADMIN: case AuthLevel.OWNER: return BigInt(1 << 3)
      default: return 0n
    }
  }

  /**
   * Get the origin from an interaction event
   * THIS IS REQUIRED TO BE HARDCODED FOR SUBACTIONS
   * @param   interaction The interaction from the event
   * @returns             The origin
   */
  getInteractionOrigin (interaction: Oceanic.AnyInteractionGateway): Origin['Interaction'] {
    return {
      type: 'interaction',
      value: interaction
    }
  }

  /**
   * Get the origin from an event
   * @param event The raw event data
   */
  abstract getOrigin (...event: Oceanic.ClientEvents[EffectEventGroup[E]]): Origin[keyof Origin]

  /** The events that trigger this effect */
  abstract readonly _trigger: Trigger<E>

  /** The identifer of this effect */
  abstract _identifier: string

  /** Miscellaneous effect options */
  abstract options: {
    /** The authorization level required to use this effect */
    clearance: AuthLevel | number
  }

  subactions: Record<string, Action<E, RequestType.SUBACTION>>

  constructor (data: EffectData<E>) {
    const {
      subactions = {}
    } = data

    this.subactions = subactions
  }

  /**
   * A hook to run upon the registration of an effect into the effect handler
   * @param handler The effect handler
   */
  async registrationHook? (handler: EffectHandler): Promise<void>

  action?: Action<E, RequestType.ACTION>

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
