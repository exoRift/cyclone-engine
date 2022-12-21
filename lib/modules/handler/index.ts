import {
  ClientEvents
} from 'oceanic.js'

import {
  Agent
} from 'agent/'

import {
  Effect
} from 'structures/'

/** A handler to recognize and process interactions and events */
class EffectHandler {
  agent: Agent /** The parent agent */

  registry = new Map<string, Effect>() /** The registered effects */

  /**
   * Construct an effect handler
   * @param agent The parent agent
   */
  constructor (agent: Agent) {
    this.agent = agent
  }

  /**
   * Register an effect to be listened for
   * @param          effect The effect
   * @throws {Error}
   */
  register (effect: Effect): void {
    if (this.registry.has(effect._identifier)) throw Error('interaction already registered')

    this.registry.set(effect._identifier, effect)
  }
}

export default EffectHandler

export {
  EffectHandler
}
