import * as Oceanic from 'oceanic.js'

import {
  CommandData,
  RequestType,
  RequestEntity,
  ResponseEntity
} from 'structures'

/**
 * The action to execute on trigger
 * @template E   The event group of this action
 * @template T   The type of the request this action is a part of
 * @param    req The request entity
 * @param    res The response entity
 * @returns      Nothing or a string to log from the agent
 */
export type Action<E extends keyof EffectEventGroup = keyof EffectEventGroup, T extends RequestType = RequestType.ACTION> =
  (req: RequestEntity<E, T>, res: ResponseEntity<E, T>) => Promisable<string | void>

/** A command argument */
export interface Argument extends Omit<CommandData<Oceanic.ApplicationCommandTypes.CHAT_INPUT>, 'type' | 'args' | 'subcommands' | 'options' | 'action'> {
  /** The argument type */
  type: ArgumentType
  /** Is this argument required? */
  required?: boolean
  /** Argument options */
  options?: {
    /** Locales for the argument */
    locales?: ConsolidatedLocaleMap
  }
}

/** The type for a command argument */
export type ArgumentType = Exclude<
Oceanic.ApplicationCommandOptionTypes,
Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND | Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP
>

/** Power levels for permissions */
export const enum AuthLevel {
  MEMBER = 'member',
  ADMIN = 'admin',
  OWNER = 'owner'
}

/** A locale map that is more developer-friendly to define */
export type ConsolidatedLocaleMap = Partial<Record<Oceanic.Locale, {
  /** The command or argument's name */
  name?: string
  /** The command or argument's description */
  description?: string
}>>

export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never

/** Event sets for types of handling */
export declare interface EffectEventGroup {
  interaction: keyof Oceanic.ClientEvents & ('interactionCreate')
  message: keyof Oceanic.ClientEvents & ('messageCreate' | 'messageUpdate' | 'messageDelete')
  reaction: keyof Oceanic.ClientEvents & ('messageReactionAdd' | 'messageReactionRemove')
}

/**
 * Convert an interface into a union of exclusive pairs
 * @template T The interface
 */
export type ExclusivePair<T extends object> = {
  [K in keyof T]: [K, T[K]]
}[keyof T]

/**
 * Convert an interface into a union of exclusive tuples with the third element being an interface indexed by the value
 * @template T The interface
 * @template U The second interface to index
 */
export type ExclusivePairWithIndex<T extends object, U extends object> = {
  [K in keyof T]: T[K] extends keyof U ? [K, T[K], U[T[K]]] : [K, T[K]]
}[keyof T]

/** Extract the return type of a constructor */
export type ExtractInstance<T> = T extends new (...args: any[]) => infer U ? U : never

/** Parameters of a command guide */
export interface GuideOptions {
  /** The color of the guide sidebar (Tip: use 0x hex literals to use hex colors) */
  color?: number
  /** The display fields of the menu */
  fields?: object[]
}

/** A value that can be a promise nor not */
export type Promisable<T> = PromiseLike<T> | T

/**
 * Require all fields except ...
 * @template T The interface
 * @template K The key of the interface to omit
 */
export type RequiredExcept<T extends object, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>

/** Convert a union into an intersection */
export type UnionToIntersection<T> =
  (T extends unknown ? (x: T) => unknown : never) extends
  (x: infer R) => unknown ? R : never

// TEMP: This is for until TS 5.0
declare global {
  interface Array<T> {
    findLast<S extends T>(predicate: (value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined
    findLast(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined
    findLastIndex(
      predicate: (value: T, index: number, obj: T[]) => unknown,
      thisArg?: any
    ): number
  }
}
