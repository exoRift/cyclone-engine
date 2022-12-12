import Oceanic from 'oceanic.js'
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

/**
 * The main controlling agent of the bot
 */
class Agent {
  client: Oceanic.Client
  handlers: {
    command?: CommandHandler,
    reaction?: ReactionHandler
  } = {}

  constructor (token: string) {
    this.client = new Oceanic.Client({ auth: token })
  }

  loadCommands (dir: string): Promise<void[]> {
    if (!this.handlers.command) this.handlers.command = new CommandHandler(this)

    return this._loadActions<Command>(this.handlers.command, dir)
  }

  loadReactCommands (dir: string): Promise<void[]> {
    if (!this.handlers.reaction) this.handlers.reaction = new ReactionHandler(this)

    return this._loadActions<ReactCommand>(this.handlers.reaction, dir)
  }

  private _loadActions<R extends Action> (handler: BaseHandler<R>, dir: string): Promise<void[]> {
    return fs.readdir(dir)
      .then((files) => Promise.all(files.map((f) => import(f)
        .then((action) => handler.registerAction(action)))))
  }

  /**
   * Connect to the Discord API and initiate event handlers.
   * @returns {Promise}
   */
  connect (): Promise<void> {
    return this.client.connect()
      .then(() => this._initializeHandlers())
      .catch(this._buildErrorHandler('agent', 'connection'))
  }

  private _initializeHandlers (): void { // todo
    console.log()
  }

  /**
   * Build a callable function that handles errors received
   * @private
   * @generator
   * @param     {String} source  Where in the library this error occured
   * @param     {String} reason  What process did this error occur during?
   * @returns   {function: void} The callable handle function
   */
  private _buildErrorHandler (source: string, reason: string): (error: Error) => void {
    return (error: Error) => {
      console.error(`Cyclone Error:\n|${source}, ${reason}:\n|`, error)
    }
  }
}

export default Agent

export {
  Agent
}
