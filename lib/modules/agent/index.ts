import * as Oceanic from 'oceanic.js'
import fs from 'fs/promises'
import chalk, { ChalkInstance } from 'chalk'

import { EffectHandler } from 'modules/handler'

import { Effect } from 'structures'

/** Additional options */
export interface CycloneOptions {
  /** Dump extra information about errors before the process closes */
  debug?: boolean
  /** Clear guild-specific commands when disconnect is called */
  clearGuildCommandsOnDisconnect?: boolean
}

// todo: organize methods
/**
 * The main controlling agent of the bot
 */
export class Agent {
  /** The default extension regex for effect importing */
  private static readonly _defaultExtensionRegex = /\.[cm]?js$/
  /** Background colors for reports depending on protocol */
  private static readonly _reporterColors = {
    log: 'bgCyan' as keyof ChalkInstance,
    info: 'bgGreen' as keyof ChalkInstance,
    warn: 'bgYellow' as keyof ChalkInstance,
    error: 'bgRed' as keyof ChalkInstance
  }

  /** Backlogged errors to be logged when the application closes (courtesy of debug mode) */
  private _backloggedErrors: object[] = []

  /** The Oceanic client */
  client: Oceanic.Client
  /** Additional options */
  options: Required<CycloneOptions>
  /** The effect handler */
  handler = new EffectHandler(this)
  /** Whether the agent has been initialized with bound events or not */
  initialized = false

  /**
   * Construct a Cyclone agent
   * @param   data The bot token or an object containing the token and additional Cyclone options and a passthrough for Oceanic options
   * @example      For bot applications, be sure to prefix the token with "Bot "
   */
  constructor (data: string | {
    token: string,
    cycloneOptions?: CycloneOptions,
    oceanicOptions?: Omit<Oceanic.ClientOptions, 'auth'>
  }) {
    const {
      token,
      cycloneOptions: {
        debug = true,
        clearGuildCommandsOnDisconnect = false
      } = {},
      oceanicOptions = {}
    } = typeof data === 'string'
      ? {
          token: data
        }
      : data

    this.client = new Oceanic.Client({
      ...oceanicOptions,
      auth: token
    })

    this.options = {
      debug,
      clearGuildCommandsOnDisconnect
    }

    if (debug) {
      process.on('SIGINT', () => this._dumpBacklog())
      process.on('SIGTERM', () => this._dumpBacklog())
    }
  }

  /** Dump the backlogged error debugging data into the console */
  private _dumpBacklog (): void {
    this.report('info', 'debug', 'Debug mode was enabled so Cyclone will now dump all backlogged errors')

    for (const err of this._backloggedErrors) console.error('BACKLOGGED ERROR:', err)
  }

  /**
   * Register a directory of files that export effects as default
   * @param dir            The directory to load
   * @param extensionRegex A regex used to select file extensions
   */
  registerEffectsFromDir (dir: string, extensionRegex: RegExp = Agent._defaultExtensionRegex): Promise<void[]> {
    this.report('log', 'register', `Registering effects from '${dir}...'`)

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
  registerEffect (effect: Effect.Base): Promise<void> {
    return this.handler.register(effect)
  }

  /** Listen for core events from Oceanic */
  private _bindCoreEvents (): void {
    this.client.on('error', (e) => this.report('error', 'oceanic', e))

    this.client.on('shardReady', (id) => this.report('info', 'oceanic', `Shard ${id} connected`))
    this.client.on('shardDisconnect', (id) => this.report('warn', 'oceanic', `Shard ${id} disconnected`))
  }

  /**
   * Report a formatted message to the console
   * @template M        The type of the message
   * @param    protocol The console protocol to use (log, info, warn, error)
   * @param    source   What is emitting this report?
   * @param    message  The message to report
   * @param    metadata Additional data for an error to be dumped at proccess termination in debug mode
   */
  report<M> (
    protocol: keyof typeof Agent._reporterColors & keyof Console,
    source: string,
    message: M,
    metadata?: object
  ): void {
    const bangBack = chalk[Agent._reporterColors[protocol]] as ChalkInstance
    const bangTag = chalk.bold.bgBlue.white('Cyclone')
    const bangSource: string = bangBack.white(source)
    const bangFlag = bangBack.bold.white('>')

    console[protocol](`${bangTag} ${bangSource}${bangFlag}`, message)

    if (protocol === 'error' && metadata) {
      this._backloggedErrors.push({
        err: message,
        ...metadata
      })
    }
  }

  /** Connect to the Discord API via websocket and initiate event handlers. */
  connect (): Promise<void> {
    this.report('log', 'connect', 'Connecting to Discord API...')

    return this.client.connect()
      .then(() => {
        if (!this.initialized) {
          this._bindCoreEvents()

          this.initialized = true
        }
      })
      .catch((e) => {
        this.report('error', 'connect', e)

        throw e
      })
  }

  /** Disconnect the Discord bot from the websocket connection */
  disconnect (): void {
    return this.client.disconnect()
  }
}
