import Eris from 'eris'

import {
  Command
} from '../structures/'

/**
 * The main controlling agent of the bot
 */
class Agent {
  client: Eris.Client

  constructor (token: string) {
    this.client = new Eris.Client(token)
  }

  attachCommands (commands: Command[]): void {

  }

  attachReplacers (replacers: Replacer[]): void {

  }

  attachReactCommands (reactCommands: ReactCommand[]): void {

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

  _initializeHandlers (): void {
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
  _buildErrorHandler (source: string, reason: string): (error: Error) => void {
    return (error: Error) => {
      console.error(`Cyclone Error:\n|${source}, ${reason}:\n|`, error)
    }
  }
}

export default Agent
