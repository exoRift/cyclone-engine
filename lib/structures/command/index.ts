import {
  AuthLevel,
  CommandAction,
  GuideOptions
} from 'types/'

/** The type of command and how it's triggered */
enum CommandType {
  SLASH,
  MESSAGE
}

/** The type of an argument and how it's received */
enum ArgumentType {
  STRING,
  NUMBER,
  USER,
  CHANNEL
}

/** Command argument */
interface Argument {
  name: string, /** The name of the argument */
  required?: boolean, /** Whether the argument is required for the command to be run or not */
  type?: ArgumentType, /** What type of argument this is */
  delimiter?: string /** What separates this argument from the next one */
}

/** Command options */
interface CommandOptions<T extends CommandType> {
  aliases?: string[], /** A list of aliases for the command */
  triggerOnEdit?: T extends CommandType.MESSAGE ? boolean : never, /** Whether the command should be triggered on edits */
  guide?: GuideOptions, /** Extra data for how the command appears in the guide */
  clearance?: AuthLevel, /** The clearance level required for a user to run this command */
  guildOnly?: boolean, /** Whether the command can only be executed in guilds or not */
  restricted?: boolean /** Whether this command is restricted to the owner of the bot or not */
}

/** Input data for commands */
interface CommandData {
  name: string, /** The name of the command */
  description?: string, /** A description of the command */
  type?: CommandType /** The type of command and how it's triggered */
  options?: CommandOptions<CommandType>, /** Miscellaneous options for the command */
  args: Argument[], /** A list of the command's arguments */
  action: CommandAction /** The action for the command to execute */
} // todo: define CommandAction

class Command implements Required<CommandData> {
  /**
   * The prefixes for arguments depending on type
   */
  private static readonly _typePrefixes = {
    [ArgumentType.STRING]: '',
    [ArgumentType.NUMBER]: '#',
    [ArgumentType.USER]: '@',
    [ArgumentType.CHANNEL]: '[#]'
  }

  /**
   * Return a blurb for an argument
   * @param   {Argument} arg The argument
   * @returns {String}
   */
  static getArgBlurb (arg: Required<Argument>): string {
    const inside = `${Command._typePrefixes[arg.type] || ''}${arg.name}`

    return arg.required ? `<${inside}>` : `(${inside})`
  }

  _identifier: string
  name: string /** The name of the command */
  description: string /** A description of the command */
  type: CommandType /** The type of command */
  options: Required<CommandOptions<CommandType>> /** Miscellaneous options for the command */
  args: Required<Argument>[] = [] /** A list of the command's arguments */
  action: CommandAction /** The action for the command to execute */

  /**
   * Construct a Command
   * @param {CommandData} data The data for the command
   */
  constructor (data: CommandData) {
    const {
      name,
      description = '',
      type = CommandType.SLASH,
      options = {},
      args = [],
      action
    }: CommandData = data

    const {
      aliases = [],
      triggerOnEdit = false,
      guide = {},
      clearance = AuthLevel.MEMBER,
      guildOnly = false,
      restricted = false
    }: Omit<CommandOptions<typeof type>, 'triggeredOnEdit'> & { triggeredOnEdit?: boolean } = options

    this.name = name.toLowerCase()
    this._identifier = this.name
    this.description = description
    this.type = type

    this.options = {
      aliases,
      triggerOnEdit,
      guide,
      clearance,
      guildOnly,
      restricted
    }

    this._digestArguments(args)
    this.action = action.bind(this)
  }

  /**
   * Get a blurb string describing the command
   * @type {String}
   * @example       '**name**|**alias** **<mandatory arg> (optional arg) (#number arg)** - *description*'
   */
  get blurb (): string {
    const name = `**${this.name}**` + this.options.aliases.reduce((accum, alias) => `${accum}|**${alias}**`, '')

    const args = this.args.reduce((accum, arg, index) => {
      const lastArg = index === this.args.length - 1

      return Command.getArgBlurb(arg) + (lastArg ? '' : arg.delimiter)
    }, '')

    return `${this.options.restricted ? '~~' : ''}${name}${args ? ` **${args}**` : ''} - *${this.description}*${this.options.restricted ? '~~' : ''}`
  }

  /**
   * Digest provided argument data into consistent argument blocks
   * @param {Argument[]} args The arguments
   */
  private _digestArguments (args: Argument[]): void {
    for (const arg of args) {
      this.args.push({
        name: arg.name.toLowerCase(),
        required: arg.required || false,
        type: arg.type || ArgumentType.STRING,
        delimiter: arg.delimiter || ' '
      })
    }
  }
}

export default Command

export {
  Argument,
  AuthLevel,
  Command,
  CommandOptions,
  CommandData,
  ArgumentType
}
