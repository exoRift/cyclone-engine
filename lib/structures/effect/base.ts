import { EffectHandler } from 'modules'

import { RequestEntity } from 'structures/request'
import { ResponseEntity } from 'structures/response'

import { EffectEventGroup } from 'types'

/** Data pertaining to what triggers an effect */
export type Trigger<G extends keyof EffectEventGroup = keyof EffectEventGroup> = {
  [K in keyof EffectEventGroup & G]: {
    /** The event group that triggers this effect type */
    group: K,
    /** That actual events that will trigger this effect instance */
    events: EffectEventGroup[K][]
  }
}[keyof EffectEventGroup & G]

/**
 * The base effect class
 * @namespace Effect
 */
export abstract class Base<E extends keyof EffectEventGroup = keyof EffectEventGroup> {
  /** The events that trigger this effect */
  abstract readonly _trigger: Trigger<E>

  /** The identifer of this effect */
  abstract _identifier: string

  /** A hook to run upon the registration of an effect into the effect handler */
  async registrationHook? (handler: EffectHandler): Promise<void>

  /** The action to execute on trigger */
  abstract action?: (req: RequestEntity<E>, res: ResponseEntity<E>) => string | void
}
