import * as Oceanic from 'oceanic.js'

/** Relevant locations to direct operations */
export interface Origins {
  /** The last relevant channel */
  channel: Oceanic.TextChannel
  /** The last relevant message */
  message: Oceanic.Message
}

/** The base operation class */
export abstract class Base<T, R extends keyof Origins> {
  /** The type of operation this is */
  abstract readonly type: string
  /** The origins this operation requires */
  abstract readonly requisites: R[]
  /** The execution data */
  readonly data: T

  /**
   * Construct a base operation
   * @param data The execution data
   */
  constructor (data: T) {
    this.data = data
  }

  /**
   * Execute the operation
   * @param origins The origins
   */
  abstract execute (origins: Pick<Origins, R>): Promise<Partial<Origins>>
}
