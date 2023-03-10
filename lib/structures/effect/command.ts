import * as Oceanic from 'oceanic.js'

import { EffectHandler } from 'modules'

import {
  Base,
  EffectData,
  Trigger
} from './base'

import {
  Action,
  Argument,
  AuthLevel,
  ConsolidatedLocaleMap,
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
  /** The command's subcommands */
  subcommands: CommandData<T>['type'] extends Oceanic.ApplicationCommandTypes.CHAT_INPUT ? Array<Command<Oceanic.ApplicationCommandTypes.CHAT_INPUT>> : []
  /** The arguments for the command */
  args: CommandData<T>['type'] extends Oceanic.ApplicationCommandTypes.CHAT_INPUT ? Argument[] : []
  /** Miscellaneous command options */
  options?: {
    /**
     * The authorization level required to use this command
     * This property can either be a preset [AuthLevel]{@link AuthLevel} value or a [Discord permissions number]{@link https://discord.com/developers/docs/topics/permissions}
     * Your permission integer can be easily generated using bitwise shift (`1 << NUMBER`) and chained with bitwise or (`|`)
     */
    clearance?: AuthLevel | number
    /** Is this command NSFW? */
    nsfw?: boolean
    /** Can this command only be used in guilds? */
    guildOnly?: boolean
    /** Locales for the command */
    locales?: ConsolidatedLocaleMap
    /** Can this command only be used by the bot owner? */
    restricted?: boolean // todo
  }
  /** The command's execution action */
  action?: Action<'interaction'>
}

/**
 * An effect for the Discord interaction Commands API
 * @namespace                   Effect
 * @template                    T      The type of command
 * @implements {CommandData<T>}
*/
export class Command<T extends Oceanic.ApplicationCommandTypes = Oceanic.ApplicationCommandTypes>
  extends Base<'interaction'>
  implements RequiredExcept<CommandData<T>, 'action'> {
  readonly _trigger: Trigger<'interaction'> = {
    group: 'interaction',
    events: ['interactionCreate']
  }

  _identifier: string

  type: T
  name: string
  description: CommandData<T>['description']
  subcommands: CommandData<T>['subcommands']
  args: CommandData<T>['args']
  options: {
    clearance: AuthLevel | number
    nsfw: boolean
    guildOnly: boolean
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

    const [
      nameLocalizations,
      descriptionLocalizations
    ] = Command.compileLocales(locales)

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
  static compileLocales (locales: ConsolidatedLocaleMap): [names: Oceanic.LocaleMap, descs: Oceanic.LocaleMap] {
    const nameLocalizations: Oceanic.LocaleMap = {}
    const descriptionLocalizations: Oceanic.LocaleMap = {}

    for (const locale in locales) {
      const localeData = locales[locale as Oceanic.Locale]! // eslint-disable-line @typescript-eslint/no-non-null-assertion

      if ('name' in localeData) nameLocalizations[locale as Oceanic.Locale] = localeData.name
      if ('description' in localeData) descriptionLocalizations[locale as Oceanic.Locale] = localeData.description
    }

    return [
      nameLocalizations,
      descriptionLocalizations
    ]
  }

  /**
   * Construct a command effect
   * @param data Data for the command effect
   */
  constructor (data: CommandData<T> & EffectData<'interaction'>) {
    super(data)

    const {
      type,
      name,
      description = '',
      subcommands = [],
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

    this.action = action
  }

  getOrigin = super.getInteractionOrigin

  /** Compile the command into a static object for registration */
  compile (): Oceanic.CreateApplicationCommandOptions {
    const [
      nameLocalizations,
      descriptionLocalizations
    ] = Command.compileLocales(this.options.locales)

    const core = {
      name: this.name,
      defaultMemberPermissions: Command.authToPermission(this.options.clearance)?.toString(),
      dmPermission: !this.options.guildOnly,
      nsfw: this.options.nsfw,
      nameLocalizations
    }

    if (this.type === Oceanic.ApplicationCommandTypes.CHAT_INPUT) {
      const options = this.subcommands
        .map((c) => {
          const compiled = c.compile()

          const suboptions = {
            ...compiled,
            type: c.subcommands.length
              ? Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP
              : Oceanic.ApplicationCommandOptionTypes.SUB_COMMAND
          }

          return suboptions as Oceanic.ApplicationCommandOptions // NOTE: The type can't be SUB_COMMAND_GROUP if there are no subcommands
        })
        .concat(this.args.map((a) => Command.compileArgument(a)))

      return {
        ...core,
        type: this.type, // TEMP: (see: https://github.com/microsoft/TypeScript/issues/51693#issuecomment-1379008559)
        description: this.description,
        options,
        descriptionLocalizations
      }
    } else {
      return {
        ...core,
        type: this.type // TEMP: (see: https://github.com/microsoft/TypeScript/issues/51693#issuecomment-1379008559)
      }
    }
  }

  /**
   * Upon being registered into the effect handler, register the command into the API
   * @param handler The effect handler
   */
  async registrationHook (handler: EffectHandler): Promise<void> {
    return await handler.agent.client.application.createGlobalCommand(this.compile()).then()
  }
}
