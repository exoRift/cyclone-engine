import Oceanic from 'oceanic.js'
import fs from 'fs/promises'
import chalk, {
  ChalkInstance
} from 'chalk'

import {
  EffectHandler
} from 'modules/'

import {
  Effect
} from 'structures/'

// todo: organize methods
// todo: make sure triggered actions include the event name/data
/**
 * The main controlling agent of the bot
 */
class Agent {
  private static readonly _defaultExtensionRegex = /\.[cm]?js$/ /** The default extension regex for effect importing */
  private static readonly _reporterColors = {
    log: 'bgCyan' as keyof ChalkInstance,
    info: 'bgGreen' as keyof ChalkInstance,
    warn: 'bgYellow' as keyof ChalkInstance,
    error: 'bgRed' as keyof ChalkInstance
  } /** Background colors for reports depending on protocol */

  private _backloggedErrors: object[] = [] /** Backlogged errors to be logged when the application closes (courtesy of debug mode) */

  client: Oceanic.Client /** The Oceanic client */
  handler = new EffectHandler(this) /** The effect handler */
  initialized = false /** Whether the agent has been initialized with bound events or not */

  /**
   * Construct a Cyclone agent
   * @param   token   The bot token
   * @param   options Additional options
   * @example         For bot applications, be sure to prefix the token with "Bot "
   */

  constructor (token: string) {
    this.client = new Oceanic.Client({ auth: token })
  }

  /**
   * Register a directory of files that export effects as default
   * @param   dir            The directory to load
   * @param   extensionRegex A regex used to select file extensions
   */
  registerEffectsFromDir (dir: string, extensionRegex: RegExp = Agent._defaultExtensionRegex): Promise<void[]> {
    return fs.readdir(dir)
      .then((files) => Promise.all(files
        .filter((f) => f.match(extensionRegex))
        .map((f) =>
          import(f)
            .then((e) => this.registerEffect(e))
        )
      ))
  }

  /**
   * Register an effect to be listened for in the effect handler
   * @param effect The effect to listen for
   */
  registerEffect (effect: Effect): void {
    this.handler.register(effect)
  }

  /** Listen for core events from Oceanic */
  private _bindCoreEvents (): void {
    this.client.on('error', (e) => this._report('error', 'oceanic', e))

    this.client.on('shardReady', (id) => this._report('info', 'oceanic', `Shard ${id} connected`))
    this.client.on('shardDisconnect', (id) => this._report('warn', 'oceanic', `Shard ${id} disconnected`))
  }

  /**
   * Report a formatted message to the console
   * @param {String} protocol The console protocol to use (log, info, warn, error)
   * @param {String} source   What is emitting this report?
   * @param {*}      message  The message to report
   */
  private _report<T> (
    protocol: keyof typeof Agent._reporterColors & keyof Console,
    source: string,
    message: T
  ): void {
    const fBang: string = chalk.bold.bgBlue.white('CE>')
    const fType: string = (chalk.bold[Agent._reporterColors[protocol]] as ChalkInstance).white(protocol)
    const fSource: string = chalk.italic.bgWhite.black(source)

    console[protocol](fBang, fType, fSource, message)

  }

  /** Connect to the Discord API via websocket and initiate event handlers. */
  connect (): Promise<void> {
    return this.client.connect()
      .then(() => {
        if (!this.initialized) {
          this._bindCoreEvents()

          this.initialized = true
        }
      })
      .catch((e) => {
        this.report('error', 'connection', e)

        throw e
      })
  }

  /** Disconnect the Discord bot from the websocket connection */
  disconnect (): void {
    return this.client.disconnect()
  }
}

export default Agent

export {
  Agent
}
