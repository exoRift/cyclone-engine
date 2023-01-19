import { Agent } from 'modules'
import { Origin } from 'structures/response'
import { ExtractInstance } from 'types'

type ResolveOperationType<T extends OperationType> = T extends 'operation' ? never : typeof Base<any, 'operation'>

export type OperationType = 'operation' | 'modifier'

/** The base operation class */
export abstract class Base<D, T extends OperationType = 'operation', O extends ResolveOperationType<T> = ResolveOperationType<T>> {
  /** The type of operation */
  abstract readonly type: T
  /** The operation type this modifier is targeting */
  readonly operand?: T extends 'operation' ? never : O

  /** The execution data */
  readonly data: D

  /**
   * Construct a base operation
   * @param data The execution data
   */
  constructor (data: D) {
    this.data = data
  }

  /**
   * Execute the operation
   * @param target Either the origin of the operation or the operand its targeting as a modifier
   */
  abstract execute (target?: T extends 'operation' ? Origin : ExtractInstance<O>, agent?: Agent): T extends 'operation' ? Promise<Origin | void> : void
}
