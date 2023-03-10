import * as Oceanic from 'oceanic.js'

import { Agent } from 'modules/agent'

import {
  Effect,
  RequestEntity,
  RequestType,
  ResponseEntity
} from 'structures/'

import {
  Action,
  EffectEventGroup,
  ExclusivePairWithIndex,
  UnionToIntersection
} from 'types'

type IntermediaryEventRegistryRecord = {
  [K in keyof EffectEventGroup]: {
    [key in EffectEventGroup[K]]?: Map<string, Effect.Base<K>>
  }
}

export type EventRegistryRecord = UnionToIntersection<IntermediaryEventRegistryRecord[keyof IntermediaryEventRegistryRecord]>

/** A handler to recognize and process interactions and events */
export class EffectHandler {
  /** The promise of the command fetch */
  private readonly _apiRegisteredCommands: Promise<Map<string, Oceanic.AnyApplicationCommand>>
  /** The registered effects */
  private readonly _effectRegistry: EventRegistryRecord & Partial<Record<keyof Oceanic.ClientEvents, Map<string, Effect.Base>>> = {}
  /** Registered temporary subactions */
  private readonly _subactionRegistry = new Map<string, Action<keyof EffectEventGroup, RequestType.SUBACTION>>()

  /** The parent agent */
  agent: Agent

  /**
   * Construct an effect handler
   * @param agent The parent agent
   */
  constructor (agent: Agent) {
    this.agent = agent

    this._apiRegisteredCommands = this._fetchRegisteredCommands()

    if (!this.agent.client.ready) this.agent.client.on('ready', () => { void this.pruneCommands() })
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
      .catch((err) => {
        this.agent.report('error', 'effect handler', err)

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

          if (!this._effectRegistry.interactionCreate?.has(command[0])) promises.push(this.agent.client.application.deleteGlobalCommand(command[1].id))
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
      if (!(event in this._effectRegistry)) {
        this.agent.report('log', 'register', `Listening for '${event}'`)

        this._effectRegistry[event] = new Map() // Map type resolved based on event

        this.agent.client.on(event, (...data) => {
          void this.handle(...[effect._trigger.group, event, data] as ExclusivePairWithIndex<EffectEventGroup, Oceanic.ClientEvents>)
        })
      } else if (this._effectRegistry[event]!.has(effect._identifier)) throw Error('effect already registered') // eslint-disable-line @typescript-eslint/no-non-null-assertion

      this._effectRegistry[event]!.set(effect._identifier, effect) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    }

    return effect.registrationHook?.(this) ?? Promise.resolve()
  }

  registerTemporarySubaction (id: string, action: Action<keyof EffectEventGroup, RequestType.SUBACTION>): void {
    this._subactionRegistry.set(id, action)
  }

  /**
   * Handle an effect-triggering event
   * @param param0 An array containing the event group, event, and event data
   */
  async handle (...[group, event, data]: ExclusivePairWithIndex<EffectEventGroup, Oceanic.ClientEvents>): Promise<void> {
    let req // Resolved to a RequestEntity type later

    switch (group) {
      case 'interaction': {
        const [command] = data

        switch (command.type) {
          case Oceanic.InteractionTypes.APPLICATION_COMMAND: {
            const effect = this._effectRegistry[event]?.get(command.data.name)

            if (!effect) return

            await command.defer()

            req = new RequestEntity({
              type: RequestType.ACTION,
              handler: this,
              effect,
              action: effect.action,
              event,
              raw: data,
              channel: command.channel,
              user: command.user,
              member: command.member
            })
            req.digestInteractionArguments(command.data.options.raw)

            if (effect instanceof Effect.Command) await this.callSubcommandActions(req, effect, command.data.options.raw)

            break
          }
          case Oceanic.InteractionTypes.MESSAGE_COMPONENT: {
            const [type, effectEvent, effectName, subID] = command.id.split('.')

            const effect = this._effectRegistry[effectEvent as keyof typeof this._effectRegistry]?.get(effectName) as Effect.Base<keyof EffectEventGroup>

            if (!effect) {
              this.agent.report('error', 'handle', 'A message component\'s ID did not link to a registered event/effect', command)

              return
            }

            const subaction = type === 'STATIC'
              ? effect?.subactions[subID]
              : this._subactionRegistry.get(command.id)

            if (subaction) {
              await command.defer()

              req = new RequestEntity({
                type: RequestType.SUBACTION,
                handler: this,
                effect,
                action: subaction,
                event,
                raw: data,
                channel: command.channel,
                user: command.user,
                member: command.member
              })
            } else {
              this.agent.report('error', 'handle', 'Failed to match a message component\'s ID to a subaction', command)

              return
            }

            break
          }
          default: return
        }

        break
      }
      default: return
    }

    return await this.callAction(req as RequestEntity) // Can't turn 'interaction' into keyof EffectEventGroup
  }

  /**
   * Call the subcommands of a triggered effect
   * @param req    The request entity
   * @param effect The effect
   * @param args   The interaction options
   */
  async callSubcommandActions (
    req: RequestEntity<'interaction', RequestType.ACTION>,
    effect: Effect.Command, args: Oceanic.InteractionOptions[]
  ): Promise<void> {
    for (const arg of args) {
      switch (arg.type) {
        case Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP: {
          if (arg.options) {
            const subcommand = effect.subcommands.find((c) => c._identifier === arg.name)

            if (subcommand) await this.callSubcommandActions(req, subcommand, arg.options)
          }

          break
        }
        case Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND: {
          const subReq = new RequestEntity({
            type: RequestType.ACTION,
            handler: req.handler,
            effect: req.effect,
            action: effect.action,
            event: req.event,
            raw: req.raw,
            channel: req.channel,
            user: req.user,
            member: req.member
          })

          await this.callAction(subReq)

          break
        }
        default: break
      }
    }
  }

  /**
   * Call the action of an effect
   * @template E      The event group responsible for calling this action
   * @template T      The type of the request
   * @param    effect The effect
   * @param    req    The request body
   */
  async callAction<E extends keyof EffectEventGroup, T extends RequestType> (req: RequestEntity<E, T>): Promise<void> {
    const origin = req.type === RequestType.SUBACTION
      ? req.effect.getInteractionOrigin((req.raw as Oceanic.ClientEvents[EffectEventGroup['interaction']])[0])
      : req.effect.getOrigin(...(req.raw as Oceanic.ClientEvents[EffectEventGroup[E]]))

    const res = new ResponseEntity<E, T>(req, origin)

    if (req.authFulfilled) {
      const log = await req.action?.(req, res)

      if (log) this.agent.report('log', req.effect._identifier, log)
    } else {
      void res.message({
        content: 'You lack the permissions to use this command!',
        flags: 1 << 6 // Ephemeral
      })
    }

    res
      .catch((err: Error) => this.agent.report('error', 'handle', `The '${req.effect._identifier}' effect encountered an error: ${err.message}`, {
        error: err,
        request: req
      }))
  }
}
