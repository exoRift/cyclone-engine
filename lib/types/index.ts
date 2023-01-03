import * as Oceanic from 'oceanic.js'

import { CommandData } from 'structures'

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
  name?: string,
  /** The command or argument's description */
  description?: string
}>>

/** Event sets for types of handling */
export declare interface EffectEventGroup {
  interaction: keyof Oceanic.ClientEvents & ('interactionCreate')
  message: keyof Oceanic.ClientEvents & ('messageCreate' | 'messageUpdate' | 'messageDelete')
  reaction: keyof Oceanic.ClientEvents & ('messageReactionAdd' | 'messageReactionRemove')
}

/** Convert an interface into a union of exclusive pairs */
export type ExclusivePair<T extends object> = {
  [P in keyof T]: [P, T[P]]
}[keyof T]

/** Convert an interface into a union of exclusive tuples with the third element being an interface indexed by the value */
export type ExclusivePairWithIndex<T extends object, U extends object> = {
  [P in keyof T]: T[P] extends keyof U ? [P, T[P], U[T[P]]] : [P, T[P]]
}[keyof T]

/** Parameters of a command guide */
export interface GuideOptions {
  /** The color of the guide sidebar (Tip: use 0x hex evaluation to use hex colors) */
  color?: number
  /** The display fields of the menu */
  fields?: object[]
}

/** Require all fields except */
export type RequiredExcept<T, U extends keyof T> = Required<Omit<T, U>> & Pick<T, U>
