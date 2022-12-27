import {
  ApplicationCommandOptions,
  ApplicationCommandOptionsWithValue,
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  ClientEvents,
  CreateApplicationCommandOptions,
  Locale,
  LocaleMap
} from 'oceanic.js'

import {
  AuthLevel
} from 'types'

import * as Effect from './base'

/** A locale map that is more developer-friendly to define */
type ConsolidatedLocaleMap = Partial<Record<Locale, {
  /** The command or argument's name */
  name?: string,
  /** The command or argument's description */
  description?: string
}>>

/** The type for a command argument */
type ArgumentType = Exclude<ApplicationCommandOptionTypes, ApplicationCommandOptionTypes.SUB_COMMAND|ApplicationCommandOptionTypes.SUB_COMMAND_GROUP>

/** A command argument */
interface Argument extends Omit<CommandData<ApplicationCommandTypes.CHAT_INPUT>, 'type'|'args'|'subcommands'|'options'|'action'> {
  /** The argument type */
  type: ArgumentType,
  /** Argument options */
  options: {
    /** Locales for the argument */
    locales?: ConsolidatedLocaleMap
  }
}

interface CommandActionData {

}

/**
 * Input data for commands
 * @template T The type of command
 */
interface CommandData<T extends ApplicationCommandTypes> { // todo: guide system
  /** The type of the command and the way it's called */
  type: T,
  /** The name of the command */
  name: string,
  /** A description of the command */
  description: CommandData<T>['type'] extends ApplicationCommandTypes.CHAT_INPUT ? string : '',
  /** The arguments for the command */
  args: CommandData<T>['type'] extends ApplicationCommandTypes.CHAT_INPUT ? Argument[] : [],
  /** The command's subcommands */
  subcommands: CommandData<T>['type'] extends ApplicationCommandTypes.CHAT_INPUT ? Command<T>[] : [],
  /** Miscellaneous command options */
  options?: {
    /**
     * The authorization level required to use this command
     * This property can either be a preset [AuthLevel]{@link AuthLevel} value or a [Discord permissions number]{@link https://discord.com/developers/docs/topics/permissions}
     * Your permission integer can be easily generated using bitwise shift (`0 << NUMBER`) and chained with bitwise or (`|`)
     */
    clearance?: AuthLevel | number
    /** Is this command NSFW? */
    nsfw?: boolean,
    /** Can this command only be used in guilds? */
    guildOnly?: boolean,
    /** Locales for the command */
    locales?: ConsolidatedLocaleMap
    /** Can this command only be used by the bot owner? */
    restricted?: boolean
  },
  /** The command's execution action */
  action: (data: CommandActionData) => void|string|object
}

/**
 * An effect for the Discord interaction Commands API
 * @template T The type of command
*/
class Command<T extends ApplicationCommandTypes> extends Effect.Base implements Required<CommandData<T>> {
  /** The identifer of this effect */
  _identifier: string
  /** The events that trigger this effect */
  _triggerEvents: Array<keyof ClientEvents> = ['interactionCreate']
  /** Name locales formatted for ease of command creation */
  _nameLocalizations: LocaleMap = {}
  /** Description locales formatted for ease of command creation */
  _descriptionLocalizations: LocaleMap = {}

  /** The type of the command and the way it's called */
  type: T
  /** The name of the command */
  name: string
  /** A description of the command */
  description: CommandData<T>['description']
  /** The arguments for the command */
  subcommands: CommandData<T>['subcommands']
  /** The command's subcommands */
  args: CommandData<T>['args']
  /** Miscellaneous command options */
  options: {
    /** The authorization level required to use this command */
    clearance: AuthLevel | number
    /** Is this command NSFW? */
    nsfw: boolean,
    /** Can this command only be used in guilds? */
    guildOnly: boolean,
    /** Locales for the command */
    locales: ConsolidatedLocaleMap
  }

  /**
   * Compile an argument into static digestable data for registration
   * @param   arg The argument
   * @returns     The formatted argument
   */
  static compileArgument (arg: Argument): ApplicationCommandOptionsWithValue {
    const {
      type,
      name,
      description,
      options: {
        locales = {}
      } = {}
    } = arg

    const {
      nameLocalizations,
      descriptionLocalizations
    } = Command.compileLocales(locales)

    return {
      type,
      name,
      description,
      nameLocalizations,
      descriptionLocalizations
    }
  }

  /**
   * Compile a consolidated locale map into compiled locales to digest
   * @param   locales The locales
   * @returns         Formatted locales
   */
  static compileLocales (locales: ConsolidatedLocaleMap) {
    const nameLocalizations: LocaleMap = {}
    const descriptionLocalizations: LocaleMap = {}

    for (const locale in locales) {
      const localeData = locales[locale as Locale]! // eslint-disable-line @typescript-eslint/no-non-null-assertion

      if ('name' in localeData) nameLocalizations[locale as Locale] = localeData.name
      if ('description' in localeData) descriptionLocalizations[locale as Locale] = localeData.description
    }

    return {
      nameLocalizations,
      descriptionLocalizations
    }
  }

  static authToPermission (level: AuthLevel|number): number|null {
    if (typeof level === 'number') return level

    switch (level) {
      case 'member': return null
      case 'admin': case 'owner': return 1 << 3
      default: return null
    }
  }

  /**
   * Construct a command effect
   * @param data Data for the command effect
   */
  constructor (data: CommandData<T>) {
    super()

    const {
      type,
      name,
      description,
      subcommands = [] as CommandData<T>['subcommands'],
      args = [],
      options: {
        clearance = 'member',
        nsfw = false,
        guildOnly = false,
        locales = {}
      } = {},
      action
    } = data

    this.type = type
    this.name = name.toLowerCase()
    this._identifier = this.name
    this.description = description
    this.subcommands = subcommands
    this.args = args

    this.options = {
      clearance,
      nsfw,
      guildOnly,
      locales
    }

    const {
      nameLocalizations,
      descriptionLocalizations
    } = Command.compileLocales(locales)
    this._nameLocalizations = nameLocalizations
    this._descriptionLocalizations = descriptionLocalizations

    this.action = action
  }

  /** Compile the command into a static object for registration */
  compile (): CreateApplicationCommandOptions {
    return {
      type: this.type,
      name: this.name,
      description: this.description,
      options: this.subcommands
        .map((c) => {
          const compiled = c.compile()

          return {
            ...compiled,
            type: c.subcommands.length ? ApplicationCommandOptionTypes.SUB_COMMAND_GROUP : ApplicationCommandOptionTypes.SUB_COMMAND
          } as ApplicationCommandOptions
        })
        .concat(this.args.map((a) => Command.compileArgument(a))),
      defaultMemberPermissions: Command.authToPermission(this.options.clearance)?.toString?.(),
      dmPermission: !this.options.guildOnly,
      nsfw: this.options.nsfw,
      nameLocalizations: this._nameLocalizations,
      descriptionLocalizations: this._descriptionLocalizations
    }
  }

  /** The command's execution action */
  action: (data: CommandActionData) => void
}

export default Command

export {
  Argument,
  ArgumentType,
  Command,
  CommandData,
  ConsolidatedLocaleMap,
  ApplicationCommandTypes as CommandType,
  CommandActionData
}
