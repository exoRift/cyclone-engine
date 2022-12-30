import * as Oceanic from 'oceanic.js'

import { CommandData } from 'structures'

/** A command argument */
export interface Argument extends Omit<CommandData<Oceanic.ApplicationCommandTypes.CHAT_INPUT>, 'type' | 'args' | 'subcommands' | 'options' | 'action'> {
  /** The argument type */
  type: ArgumentType,
  /** Is this argument required? */
  required?: boolean,
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
export enum AuthLevel {
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

/** Parameters of a command guide */
export interface GuideOptions {
  color?: number, /** The color of the guide sidebar (Tip: use 0x hex evaluation to use hex colors) */
  fields?: object[] /** The display fields of the menu */
}
