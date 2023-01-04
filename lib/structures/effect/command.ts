import * as Oceanic from 'oceanic.js'

import { EffectHandler } from 'modules'

import {
  Effect,
  Trigger
} from './'

import { RequestEntity } from 'structures/request'
import { ResponseEntity } from 'structures/response'

import {
  Argument,
  AuthLevel,
  ConsolidatedLocaleMap,
  Promisable,
  RequiredExcept
} from 'types'

/**
 * Input data for commands
 * @namespace Effect
 * @template  T      The type of command
 */
export interface CommandData<T extends Oceanic.ApplicationCommandTypes = Oceanic.ApplicationCommandTypes> { // todo: guide system
  /** The type of the command and the way it's called */
  type: T
  /** The name of the command */
  name: string
  /** A description of the command */
  description: CommandData<T>['type'] extends Oceanic.ApplicationCommandTypes.CHAT_INPUT ? string : ''
  /** The arguments for the command */
  args: CommandData<T>['type'] extends Oceanic.ApplicationCommandTypes.CHAT_INPUT ? Argument[] : []
  /** The command's subcommands */
  subcommands: CommandData<T>['type'] extends Oceanic.ApplicationCommandTypes.CHAT_INPUT ? Command<T>[] : []
  /** Miscellaneous command options */
  options?: {
    /**
     * The authorization level required to use this command
     * This property can either be a preset [AuthLevel]{@link AuthLevel} value or a [Discord permissions number]{@link https://discord.com/developers/docs/topics/permissions}
     * Your permission integer can be easily generated using bitwise shift (`0 << NUMBER`) and chained with bitwise or (`|`)
     */
    clearance?: AuthLevel | number
    /** Is this command NSFW? */
    nsfw?: boolean
    /** Can this command only be used in guilds? */
    guildOnly?: boolean
    /** Locales for the command */
    locales?: ConsolidatedLocaleMap
    /** Can this command only be used by the bot owner? */
    restricted?: boolean
  }
  /** The command's execution action */
  action?: (req: RequestEntity<'interaction'>, res: ResponseEntity<'interaction'>) => Promisable<string | void>
}

/**
 * An effect for the Discord interaction Commands API
 * @template                    T The type of command
 * @implements {CommandData<T>}
*/
export class Command<T extends Oceanic.ApplicationCommandTypes = Oceanic.ApplicationCommandTypes>
  extends Effect.Base<'interaction'>
  implements RequiredExcept<CommandData<T>, 'action'> {
  /** The events that trigger this effect */
  readonly _trigger: Trigger<'interaction'> = {
    group: 'interaction',
    events: ['interactionCreate']
  }

  /** The identifer of this effect */
  _identifier: string
  /** Name locales formatted for ease of command creation */
  _nameLocalizations: Oceanic.LocaleMap = {}
  /** Description locales formatted for ease of command creation */
  _descriptionLocalizations: Oceanic.LocaleMap = {}

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
    nsfw: boolean
    /** Can this command only be used in guilds? */
    guildOnly: boolean
    /** Locales for the command */
    locales: ConsolidatedLocaleMap
  }

  /**
   * Compile an argument into static digestable data for registration
   * @param   arg The argument
   * @returns     The formatted argument
   */
  static compileArgument (arg: Argument): Oceanic.ApplicationCommandOptionsWithValue {
    const {
      type,
      name,
      description,
      required = false,
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
      required,
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
    const nameLocalizations: Oceanic.LocaleMap = {}
    const descriptionLocalizations: Oceanic.LocaleMap = {}

    for (const locale in locales) {
      const localeData = locales[locale as Oceanic.Locale]! // eslint-disable-line @typescript-eslint/no-non-null-assertion

      if ('name' in localeData) nameLocalizations[locale as Oceanic.Locale] = localeData.name
      if ('description' in localeData) descriptionLocalizations[locale as Oceanic.Locale] = localeData.description
    }

    return {
      nameLocalizations,
      descriptionLocalizations
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
        clearance = AuthLevel.MEMBER,
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
  compile (): Oceanic.CreateApplicationCommandOptions {
    return {
      type: this.type,
      name: this.name,
      description: this.description,
      options: this.subcommands
        .map((c) => {
          const compiled = c.compile()

          return {
            ...compiled,
            type: c.subcommands.length ? Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP : Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND
          } as Oceanic.ApplicationCommandOptions
        })
        .concat(this.args.map((a) => Command.compileArgument(a))),
      defaultMemberPermissions: Command.authToPermission(this.options.clearance)?.toString?.(),
      dmPermission: !this.options.guildOnly,
      nsfw: this.options.nsfw,
      nameLocalizations: this._nameLocalizations,
      descriptionLocalizations: this._descriptionLocalizations
    }
  }

  /**
   * Upon being registered into the effect handler, register the command into the API
   * @param handler The effect handler
   */
  async registrationHook (handler: EffectHandler): Promise<void> {
    return handler.agent.client.application.createGlobalCommand(this.compile()).then()
  }

  /**
   * The command's execution action
   * @param   req The request entity
   * @param   res The response entity
   * @returns     Nothing or a string to log from the agent
   */
  action?: (req: RequestEntity<'interaction'>, res: ResponseEntity<'interaction'>) => Promisable<string | void>
}
