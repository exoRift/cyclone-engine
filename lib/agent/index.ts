import Oceanic, {
  ClientEvents
} from 'oceanic.js'
import fs from 'fs/promises'

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
  private static _extensionRegex = /\.[cm]?js$/
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

  private _loadActions<R extends Action> (
    handler: BaseHandler<R>,
    dir: string,
    extensionRegex: RegExp = Agent._extensionRegex, // todo
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
  private _buildErrorHandler (source: string, reason: string): (error: string | Error) => void { // todo: implement chalk
    return (error: string | Error) => {
      console.error(`Cyclone Error:\n|${source}, ${reason}:\n|`, error)
    }
  }

  private _bindCoreEvents (): void { // todo
    this.client.on('error', this._buildErrorHandler('oceanic', 'discord'))

    // this.client.on('shardReady', this._onShardReady.bind(this))
    // this.client.on('shardDisconnect', this._onShardDisconnect.bind(this))
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
    if (!this.handlers.command) this.handlers.command = new CommandHandler(this)

    return this._loadActions(this.handlers.command, dir, extensionRegex, (action: Command) => {
      this._enableEvent('messageCreate', this.handlers.command?.handle)

      if (action.options.triggerOnEdit) this._enableEvent('messageUpdate', this.handlers.command?.handle)
    })
  }

  loadReactCommands (dir: string, extensionRegex?: RegExp): Promise<void[]> {
    if (!this.handlers.reaction) this.handlers.reaction = new ReactionHandler(this)

    return this._loadActions(this.handlers.reaction, dir, extensionRegex, (action: ReactCommand) => {
      this._enableEvent('messageReactionAdd', this.handlers.reaction?.handle)

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
