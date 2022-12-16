import Oceanic, {
  ClientEvents
} from 'oceanic.js'
import fs from 'fs/promises'
import chalk, {
  ChalkInstance
} from 'chalk'

import {
  Action,
  BaseHandler,
  CommandHandler,
  ReactionHandler
} from 'handlers/'

import {
  Command,
  ReactCommand
} from 'structures/'

// todo: organize methods
// todo: make sure triggered actions include the event name/data
/**
 * The main controlling agent of the bot
 */
class Agent {
  private static readonly _extensionRegex = /\.[cm]?js$/
  private static readonly _reporterColors = {
    log: 'bgCyan' as keyof ChalkInstance,
    info: 'bgGreen' as keyof ChalkInstance,
    warn: 'bgYellow' as keyof ChalkInstance,
    error: 'bgRed' as keyof ChalkInstance
  }

  private _enabledEvents: {
    [key: string]: boolean
  } = {}

  client: Oceanic.Client
  handlers: {
    command?: CommandHandler,
    reaction?: ReactionHandler
  } = {}

  constructor (token: string) {
    this.client = new Oceanic.Client({ auth: token })
  }

  /**
   * Load a directory of actions into a handler
   * @param   {BaseHandler}    handler          The handler to load into
   * @param   {String}         dir              The directory
   * @param   {RegExp}         [extensionRegex] The regular expression used to check for file extensions
   * @param   {function: void} [postImport]     The callback to run after importing a command
   * @returns {Promise}
   */
  private _loadActions<R extends Action> (
    handler: BaseHandler<R>,
    dir: string,
    extensionRegex: RegExp = Agent._extensionRegex,
    postImport?: (action: R) => void
  ): Promise<void[]> {
    return fs.readdir(dir)
      .then((files) => Promise.all(files
        .filter((f) => f.match(extensionRegex))
        .map((f) => import(f)
          .then((action) => {
            handler.registerAction(action)

            postImport?.(action)
          })
        )
      ))
  }

  /**
 * Build a callable function that handles errors received
 * @private
 * @generator
 * @param     {String}         source  Where in the library this error occured
 * @param     {String}         reason  What process did this error occur during?
 * @returns   {function: void}         The callable handle function
 */
  private _buildErrorHandler (source: string, reason: string): (error: string | Error) => void { // temp
    return (error: string | Error) => {
      console.error(`Cyclone Error:\n|${source}, ${reason}:\n|`, error)
    }
  }

  /**
   * Listen for core events from Oceanic
   */
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
    const fType: string = (chalk.bold[Agent._reporterColors[protocol]] as ChalkInstance).white(protocol) // ugly
    const fSource: string = chalk.italic.bgWhite.black(source)

    console[protocol](fBang, fType, fSource, message)
  }

  /**
   * Enable an event listener to run actions
   * @private
   * @param   event    The event to listen for
   * @param   callback The callback for the event to call
   */
  private _enableEvent<E extends keyof ClientEvents> (event: E, callback: (...args: ClientEvents[E]) => void): void {
    if (!this._enabledEvents[event]) {
      this._enabledEvents[event] = true

      this.client.on(event, callback)
    }
  }

  /**
   * Mount a directory of commands to be handled
   * @param   {String}          dir              The directory to import
   * @param   {RegExp}          [extensionRegex] The regular expression to target the file extensions in the directory
   * @returns {Promise<void[]>}
   */
  loadCommands (dir: string, extensionRegex?: RegExp): Promise<void[]> {
    const handler = this.handlers.command || (this.handlers.command = new CommandHandler(this))

    return this._loadActions(this.handlers.command, dir, extensionRegex, (action: Command) => {
      this._enableEvent('messageCreate', handler.handle)

      if (action.options.triggerOnEdit) this._enableEvent('messageUpdate', handler.handle)
    })
  }

  /**
   * Mount a directory of react commands to be handled
   * @param   {String}          dir              The directory to import
   * @param   {RegExp}          [extensionRegex] The regular expression to target the file extensions in the directory
   * @returns {Promise<void[]>}
   */
  loadReactCommands (dir: string, extensionRegex?: RegExp): Promise<void[]> {
    if (!this.handlers.reaction) this.handlers.reaction = new ReactionHandler(this)

    return this._loadActions(this.handlers.reaction, dir, extensionRegex, (action: ReactCommand) => {
      this._enableEvent('messageReactionAdd', this.handlers.reaction.handle)

      if (action.options.triggerOnRemove) this._enableEvent('messageReactionRemove', this.handlers.reaction?.handle)
    })
  }

  /**
   * Connect to the Discord API and initiate event handlers.
   * @returns {Promise}
   */
  connect (): Promise<void> {
    return this.client.connect()
      .then(() => this._bindCoreEvents())
      .catch(this._buildErrorHandler('agent', 'connection'))
  }
}

export default Agent

export {
  Agent
}
