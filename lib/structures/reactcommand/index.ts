import {
  AuthLevel,
  CommandAction,
  GuideOptions
} from 'types/'

import {
  CommandData
} from 'structures/command/'

/** The data for a react command */
interface ReactCommandOptions {
  removeReaction?: boolean, /** Whether after the command the reaction that triggered it is removed */
  guide?: GuideOptions, /** Extra data for how the react command appears in the guide */
  clearance?: AuthLevel, /** The clearance level required for a user to run this command */
  guildOnly?: boolean /** Whether the react command can only be executed in guilds or not */
}

/** Input data for react commands */
interface ReactCommandData extends Omit<CommandData, 'name' | 'type' | 'args'> {
  emoji: string, /** The emoji that triggers this react command */
  description?: string, /** A description of the react command */
  options: ReactCommandOptions, /** Miscellaneous options for the react command */
  action: CommandAction /** The action for the react command to execute */
}

/** An action that runs on reactions */
class ReactCommand implements Required<ReactCommandData> {
  _identifier: string
  emoji: string /** The emoji that triggers this react command */
  description: string /** A description of the react command */
  options: Required<ReactCommandOptions> /** Miscellaneous options for the react command */
  action: CommandAction /** The action for the react command to execute */

  /**
   * Construct a react command
   * @param {ReactCommandData} data The data for the react command
   */
  constructor (data: ReactCommandData) {
    const {
      emoji,
      description = '',
      options = {},
      action
    }: ReactCommandData = data

    const {
      removeReaction = false,
      guide = {},
      clearance = AuthLevel.MEMBER,
      guildOnly = false
    }: ReactCommandOptions = options

    this.emoji = emoji
    this._identifier = this.emoji
    this.description = description

    this.options = {
      removeReaction,
      guide,
      clearance,
      guildOnly
    }

    this.action = action
  }

  /**
   * Get a blurb string describing the react command
   * @type {String}
   * @example       '**emoji** - *description*'
   */
  get blurb () {
    return `**${this.emoji}** - *${this.description}*`
  }
}

export default ReactCommand

export {
  ReactCommand,
  ReactCommandData
}
