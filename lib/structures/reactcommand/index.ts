import {
  CommandAction,
  GuideOptions
} from '../../types/'

import {
  CommandData
} from '../command/'

interface ReactCommandOptions {
  removeReaction?: boolean, /** Whether after the command the reaction that triggered it is removed */
  guide?: GuideOptions /** Extra data for how the command appears in the guide */
}

/** Input data for react commands */
interface ReactCommandData extends Omit<CommandData, 'name' | 'args'> {
  emoji: string, /** The emoji that triggers this react command */
  description?: string, /** A description of the react command */
  options: ReactCommandOptions, /** Miscellaneous options for the react command */
  action: CommandAction /** The action for the react command to execute */
}

class ReactCommand implements Required<ReactCommandData> {
  /**
   * Construct a Command
   * @param {ReactCommandData} data The data for the command
   */

  emoji: string /** The emoji that triggers this react command */
  description: string /** A description of the react command */
  options: Required<ReactCommandOptions> /** Miscellaneous options for the react command */
  action: CommandAction /** The action for the react command to execute */

  constructor (data: ReactCommandData) {
    const {
      emoji,
      description = '',
      options = {},
      action
    }: ReactCommandData = data

    const {
      removeReaction = false,
      guide = {}
    }: ReactCommandOptions = options

    this.emoji = emoji
    this.description = description

    this.options = {
      removeReaction,
      guide
    }

    this.action = action
  }

  /**
   * Get a blurb string describing the react command
   * @type {String}
   * @example       '**emoji** - *description*'
   */
  get blurb () {
    return `${this.options.restricted ? '~~' : ''}**${this.emoji}** - *${this.description}*${this.options.restricted ? '~~' : ''}`
  }
}

export default ReactCommand

export {
  ReactCommand,
  ReactCommandData
}
