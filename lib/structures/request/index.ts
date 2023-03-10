import * as Oceanic from 'oceanic.js'

import {
  Agent,
  EffectHandler
} from 'modules'

import { Effect } from 'structures/effect'

import {
  Action,
  EffectEventGroup
} from 'types'

/**
 * An object keyed by arguments containing their respective values
 * @example Subcommands are Argset objects themselves containing their own arguments
 */
export interface ReducedArgset {
  [key: string]: Oceanic.InteractionOptionsWithValue['value'] | ReducedArgset
}

export enum RequestType {
  ACTION,
  SUBACTION
}

/**
 * The data supplied to RequestEntities
 * @template E The event group that will utilize this request entity
 * @template T The type of the request
 */
export interface RequestData<E extends keyof EffectEventGroup = keyof EffectEventGroup, T extends RequestType = RequestType> {
  /** The request type */
  type: T
  /** The effect handler */
  handler: EffectHandler
  /** The effect being invoked by this call */
  effect: Effect.Base<E>
  /** The action to call as a result of the request */
  action?: Action<E, T>
  /** The event that triggered this call */
  event: EffectEventGroup[T extends RequestType.SUBACTION ? 'interaction' : E]
  /** The raw event data */
  raw: Oceanic.ClientEvents[EffectEventGroup[T extends RequestType.SUBACTION ? 'interaction' : E]]
  /** The channel the request was called in */
  channel?: Oceanic.AnyChannel
  /** The caller */
  user: Oceanic.User
  /** If called in a guild, the member variation of the caller */
  member?: Oceanic.Member
}

/**
 * A structured effect request
 * @template                       E The event group that will utilize this request entity
 * @template                       T The type of the request
 * @implements {RequestData<E, T>}
 */
export class RequestEntity<E extends keyof EffectEventGroup = keyof EffectEventGroup, T extends RequestType = RequestType>
implements RequestData<E, T> {
  /** The Oceanic agent */
  agent: Agent
  type: T
  handler: EffectHandler
  /** The Oceanic client */
  client: Oceanic.Client
  effect: Effect.Base<E>
  action?: Action<E, T>
  event: EffectEventGroup[T extends RequestType.SUBACTION ? 'interaction' : E]
  raw: Oceanic.ClientEvents[EffectEventGroup[T extends RequestType.SUBACTION ? 'interaction' : E]]
  /** The arguments supplied to the call */
  args: ReducedArgset = {}
  channel?: Oceanic.AnyChannel
  user: Oceanic.User
  member?: Oceanic.Member

  /**
   * Construct a RequestEntity
   * @param data The request entity data
   */
  constructor (data: RequestData<E, T>) {
    const {
      type,
      handler,
      effect,
      action,
      event,
      raw,
      channel,
      user,
      member
    } = data

    this.agent = handler.agent
    this.type = type
    this.handler = handler
    this.client = handler.agent.client
    this.effect = effect
    this.action = action
    this.event = event
    this.raw = raw
    this.channel = channel
    this.user = user
    this.member = member
  }

  /** Is the effect authorized to be executed by this user? */
  get authFulfilled (): boolean {
    if (this.member) return this.effect.fulfillsAuth(this.member)
    else return false
  }

  /** The guild the command was called in */
  get guild (): Oceanic.Guild | undefined {
    return (this.channel as Oceanic.GuildChannel)?.guild
  }

  /**
   * Compile an array of interaction options into a keyed object
   * @param   options The interaction options
   * @returns         The argument object
   */
  compileInteractionArguments (options: Oceanic.InteractionOptions[] = []): ReducedArgset {
    const result: ReducedArgset = {}

    for (const option of options) {
      result[option.name] = [
        Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND,
        Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP
      ].includes(option.type)
        ? this.compileInteractionArguments((option as Oceanic.InteractionOptionsWithOptions).options)
        : (option as Oceanic.InteractionOptionsWithValue).value
    }

    return result
  }

  /**
   * Parse interaction options into arguments
   * @param options The interaction options
   */
  digestInteractionArguments (options: Oceanic.InteractionOptions[]): void {
    this.args = this.compileInteractionArguments(options)
  }
}
