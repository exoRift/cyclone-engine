import {
  RequestType,
  RequestEntity
} from 'structures/request'
import { Origin } from 'structures/response'
import {
  EffectEventGroup,
  ExtractInstance
} from 'types'

type ResolveOperationType<T extends OperationType> = T extends 'operation' ? never : typeof Base<any, 'operation'>

export type OperationType = 'operation' | 'modifier'

/**
 * The base operation class
 * @template D The data type of the operation
 * @template T The operation type
 * @template O PSEUDO TEMPLATE: Resolved operation type
 */
export abstract class Base<D, T extends OperationType = 'operation', O extends ResolveOperationType<T> = ResolveOperationType<T>> {
  /** The type of operation */
  abstract readonly type: T

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
   * @template E      The event group of this operation execution
   * @template R      The type of the request prompting this operation
   * @param    target Either the origin of the operation or the operand its targeting as a modifier
   */
  abstract execute<E extends keyof EffectEventGroup, R extends RequestType> (
    target?: T extends 'operation' ? Origin : ExtractInstance<O>,
    req?: RequestEntity<E, R>
  ): T extends 'operation' ? Promise<Origin | void> : void
}
