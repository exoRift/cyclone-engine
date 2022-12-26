import {
  AnyApplicationCommand,
  ApplicationCommandTypes,
  ClientEvents
} from 'oceanic.js'

import {
  Agent
} from 'agent/'

import {
  Effect
} from 'structures/'

// todo: wait for connection and upon connection, purge removed commands
/** A handler to recognize and process interactions and events */
class EffectHandler {
  /** The promise of the command fetch */
  private _apiRegisteredCommands: Promise<Map<string, AnyApplicationCommand>>
  /** The registered effects */
  private _registry: Partial<Record<keyof ClientEvents, Map<string, Effect.Base>>> = {}

  /** The parent agent */
  agent: Agent

  /**
   * Construct an effect handler
   * @param agent The parent agent
   */
  constructor (agent: Agent) {
    this.agent = agent

    this._apiRegisteredCommands = this._fetchRegisteredCommands()

    this.agent.client.on('ready', () => this.pruneCommands())
  }

  /**
   * Fetch all registered global commands
   * @private
   */
  private _fetchRegisteredCommands (): Promise<Map<string, AnyApplicationCommand>> {
    return this.agent.client.application.getGlobalCommands()
      .then((commands) => {
        const map = new Map<string, AnyApplicationCommand>()

        for (const command of commands) map.set(command.name, command)

        return map
      })
      .catch((e) => {
        this.agent.report('error', 'effect handler', e)

        return new Map<string, AnyApplicationCommand>()
      })
  }

  /**
   * Deregister commands from the API that are not registered locally
   * @returns The number of commands deregistered
   */
  pruneCommands (): Promise<number> {
    return this._apiRegisteredCommands
      .then((commands) => {
        const promises = []

        for (const command of commands) {
          if (!this._registry.interactionCreate?.has?.(command[0])) promises.push(this.agent.client.application.deleteGlobalCommand(command[1].id))
        }

        return Promise.all(promises).then(() => promises.length)
      })
  }

  /**
   * Register an effect to be listened for
   * @param          effect The effect
   * @throws {Error}
   */
  register (effect: Effect.Base): Promise<void> {
    for (const event of effect._triggerEvents) {
      if (!(event in this._registry)) {
        this.agent.report('log', 'register', `Listening for '${event}'`)

        this._registry[event] = new Map<string, Effect.Base>()

        this.agent.client.on(event, (...data) => this.handle(event, ...data))
      }

      if (this._registry[event]!.has(effect._identifier)) throw Error('effect already registered') // eslint-disable-line @typescript-eslint/no-non-null-assertion

      this._registry[event]!.set(effect._identifier, effect) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    }

    return effect instanceof Effect.Command ? this.agent.client.application.createGlobalCommand(effect.compile()).then() : Promise.resolve()
  }
}

export default EffectHandler

export {
  EffectHandler
}
