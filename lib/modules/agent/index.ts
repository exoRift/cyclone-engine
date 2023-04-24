import * as Oceanic from 'oceanic.js'
import fs from 'fs/promises'
import chalk from 'chalk'

import { EffectHandler } from '../handler'

import { Effect } from '../../structures'
import { EffectEventGroup } from '../../types'

interface BackloggedError {
  message: unknown
  metadata: unknown
}

/** Additional options */
export interface CycloneOptions {
  /** Dump extra information about errors before the process closes */
  debug?: boolean
  /** Clear guild-specific commands when disconnect is called */
  clearGuildCommandsOnDisconnect?: boolean // todo
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
    log: 'bgCyan',
    info: 'bgGreen',
    warn: 'bgYellow',
    error: 'bgRed'
  } as const

  /** Backlogged errors to be logged when the application closes (courtesy of debug mode) */
  private readonly _backloggedErrors: BackloggedError[] = []

  /** The Oceanic client */
  client: Oceanic.Client
  /** Additional options */
  options: Required<CycloneOptions>
  /** The effect handler */
  handler: EffectHandler
  /** Whether the agent has been initialized with bound events or not */
  initialized = false

  /**
   * Construct a Cyclone agent
   * @param           data              The bot token or an object containing the token and additional Cyclone options and a passthrough for Oceanic options
   * @prop  {Boolean} [data.debug=true]
   * @example                           For bot applications, be sure to prefix the token with "Bot "
   */
  constructor (data: string | {
    token: string
    cycloneOptions?: CycloneOptions
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

    this.handler = new EffectHandler(this)

    this.client.once('ready', () => { void this.handler.pruneCommands() })

    this.options = {
      debug,
      clearGuildCommandsOnDisconnect
    }

    if (!debug) {
      process.on('SIGINT', () => this._dumpBacklog())
      process.on('SIGTERM', () => this._dumpBacklog())
    }
  }

  /** Dump the backlogged error debugging data into the console */
  private _dumpBacklog (): void {
    this.report('info', 'debug', 'Debug mode was disabled so Cyclone will now dump all backlogged errors')

    for (const err of this._backloggedErrors) {
      console.error('BACKLOGGED ERROR:', err.message)
      console.table(err.metadata)
    }
  }

  /**
   * Register a directory of files that export effects as default
   * @param dir            The directory to load
   * @param extensionRegex A regex used to select file extensions
   */
  registerEffectsFromDir (dir: string, extensionRegex: RegExp = Agent._defaultExtensionRegex): Promise<void> {
    this.report('log', 'register', `Registering effects from '${dir}'...`)

    return fs.readdir(dir)
      .then((files) => Promise.all(files
        .filter((f) => f.match(extensionRegex))
        .map((f) =>
          import(f)
            .then((e) => this.registerEffect(e))
        )
      )
        .then()) // Clear off the array bloat
  }

  /**
   * Register an effect to be listened for in the effect handler
   * @param effect The effect to listen for
   */
  registerEffect<E extends keyof EffectEventGroup> (effect: Effect.Base<E>): Promise<void> {
    if (this.client.ready) return this.handler.register(effect)
    else {
      return new Promise<void>((resolve) => this.client.once('ready', () => resolve()))
        .then(() => this.handler.register(effect))
    }
  }

  /** Listen for core events from Oceanic */
  private _bindCoreEvents (): void {
    this.client.on('error', (err) => this.report('error', 'oceanic', err))

    this.client.on('shardReady', (id) => this.report('info', 'oceanic', `Shard ${id} connected`))
    this.client.on('shardDisconnect', (err, id) => this.report('warn', 'oceanic', `Shard ${id} disconnected`, err))
  }

  /**
   * Report a formatted message to the console
   * @param    protocol The console protocol to use (log, info, warn, error)
   * @param    source   What is emitting this report?
   * @param    message  The message to report
   * @param    metadata Additional data for an error to be dumped at proccess termination in debug mode
   */
  report (
    protocol: keyof typeof Agent._reporterColors & keyof Console,
    source: string,
    message: unknown,
    metadata?: unknown
  ): void {
    const bangBack = chalk[Agent._reporterColors[protocol]]
    const bangTag = chalk.bold.bgBlue.white('Cyclone')
    const bangSource: string = bangBack.white(source)
    const bangFlag = bangBack.bold.white('>')

    // console.log(chalk`
    //   CPU: {red ${100}%}
    //   RAM: {green ${5}%}
    //   DISK: {rgb(255,131,0) ${3}%}
    // `)

    console[protocol](`${bangTag} ${bangSource}${bangFlag}`, message)

    if (protocol === 'error' && metadata) {
      if (this.options.debug) console.table(metadata)
      else {
        this._backloggedErrors.push({
          message,
          metadata
        })
      }
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
      .catch((err) => {
        this.report('error', 'connect', err)

        throw err
      })
  }

  /** Disconnect the Discord bot from the websocket connection */
  disconnect (): void {
    this.client.disconnect()
  }
}
