import { Origin } from 'structures/response'

/** The base operation class */
export abstract class Base<T> {
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
  abstract execute (origin: Origin): Promise<Origin | void>
}
