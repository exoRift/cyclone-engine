import * as Oceanic from 'oceanic.js'

import { Agent } from 'modules/agent'

import {
  Effect,
  RequestEntity,
  ResponseEntity
} from 'structures/'

import {
  EffectEventGroup,
  ExclusivePairWithIndex
} from 'types'

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
  register (effect: Effect.Base): Promise<void> {
    for (const event of effect._trigger.events) {
      if (!(event in this._registry)) {
        this.agent.report('log', 'register', `Listening for '${event}'`)

        this._registry[event] = new Map<string, Effect.Base>()

        this.agent.client.on(event, (...data) =>
          this.handle(...[effect._trigger.group, event, data] as ExclusivePairWithIndex<EffectEventGroup, Oceanic.ClientEvents>)
        )
      } else if (this._registry[event]!.has(effect._identifier)) throw Error('effect already registered') // eslint-disable-line @typescript-eslint/no-non-null-assertion

      this._registry[event]!.set(effect._identifier, effect) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    }

    return effect?.registrationHook?.(this) ?? Promise.resolve()
  }

  handle (...[group, event, data]: ExclusivePairWithIndex<EffectEventGroup, Oceanic.ClientEvents>): void {
    switch (group) {
      case 'interaction': {
        const [command] = data

        switch (command.type) {
          case Oceanic.InteractionTypes.APPLICATION_COMMAND: {
            const effect = this._registry[event]?.get?.(command.data.name)

            if (effect) {
              command.defer()

              const req = new RequestEntity<'interaction'>({ // todo: event, clearance
                handler: this,
                effect,
                raw: data,
                channel: command.channel,
                user: command.user,
                member: command.member
              })

              this.callSubcommandActions(req, command.data.options.raw)
            }

            break
          }

          default: break
        }

        break
      }
    }

    // todo: call action
  }

  callSubcommandActions<E extends keyof EffectEventGroup> (req: RequestEntity<E>, args: Oceanic.InteractionOptions[]): void {
    for (const arg of args) {
      switch (arg.type) {
        case Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP:
          if (arg.options) this.callSubcommandActions(req, arg.options)

          break
        case Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND:
          this.callAction(req)

          break
        default: break
      }
    }
  }

  async callAction<E extends keyof EffectEventGroup> (req: RequestEntity<E>): Promise<void> { // todo: permission check in req
    const res = new ResponseEntity<E>(req) // todo: check for owner clearance

    const log = await req.effect.action?.(req, res)

    if (log) this.agent.report('log', req.effect._identifier, log)
  }
}
