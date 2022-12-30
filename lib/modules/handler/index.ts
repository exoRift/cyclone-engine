import * as Oceanic from 'oceanic.js'

import { Agent } from 'modules/agent'

import {
  Effect,
  RequestEntity,
  ResponseEntity
} from 'structures/'

/** Event sets for types of handling */
export declare namespace EffectEventGroup {
  export type INTERACTION = keyof Oceanic.ClientEvents & ('interactionCreate')
  export type MESSAGE = keyof Oceanic.ClientEvents & ('messageCreate' | 'messageUpdate' | 'messageDelete')
  export type REACTION = keyof Oceanic.ClientEvents & ('messageReactionAdd' | 'messageReactionRemove')
}

/** A handler to recognize and process interactions and events */
export class EffectHandler {
  /** The promise of the command fetch */
  private _apiRegisteredCommands: Promise<Map<string, Oceanic.AnyApplicationCommand>>
  /** The registered effects */
  private _registry: Partial<Record<keyof Oceanic.ClientEvents, Map<string, Effect.Base>>> = {}

  /** The parent agent */
  agent: Agent

  /**
   * Construct an effect handler
   * @param agent The parent agent
   */
  constructor (agent: Agent) {
    this.agent = agent

    this._apiRegisteredCommands = this._fetchRegisteredCommands()

    if (!this.agent.client.ready) this.agent.client.on('ready', () => this.pruneCommands())
  }

  /**
   * Fetch all registered global commands
   * @private
   */
  private _fetchRegisteredCommands (): Promise<Map<string, Oceanic.AnyApplicationCommand>> {
    return this.agent.client.application.getGlobalCommands()
      .then((commands) => {
        const map = new Map<string, Oceanic.AnyApplicationCommand>()

        for (const command of commands) map.set(command.name, command)

        return map
      })
      .catch((e) => {
        this.agent.report('error', 'effect handler', e)

        return new Map<string, Oceanic.AnyApplicationCommand>()
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
          this.agent.report('warn', 'prune', `Command '${command[0]}' not registered locally. Purging from application registry...`)

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
  register<E extends Effect.Base> (effect: E): Promise<void> {
    for (const event of effect._triggerEvents) {
      if (!(event in this._registry)) {
        this.agent.report('log', 'register', `Listening for '${event}'`)

        this._registry[event] = new Map<string, E>()

        switch (event) {
          case 'interactionCreate':
            this.agent.client.on(event, (...data) => this.handleInteraction(event, data))

            break
        }
      } else if (this._registry[event]!.has(effect._identifier)) throw Error('effect already registered') // eslint-disable-line @typescript-eslint/no-non-null-assertion

      this._registry[event]!.set(effect._identifier, effect) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    }

    return effect instanceof Effect.Command ? this.agent.client.application.createGlobalCommand(effect.compile()).then() : Promise.resolve()
  }

  handleInteraction (event: EffectEventGroup.INTERACTION, data: Oceanic.ClientEvents[EffectEventGroup.INTERACTION]): void {
    const [command] = data

    switch (command.type) {
      case Oceanic.InteractionTypes.APPLICATION_COMMAND: {
        const effect = this._registry[event]?.get?.(command.data.name)

        if (effect) { // todo: check for owner clearance
          command.defer()

          const req = new RequestEntity({ // todo: parse args and call proper subcommand
            agent: this.agent,
            handler: this,
            effect,
            raw: data
          })
        }

        break
      }
      default: break
    }
  }
}
