import * as Oceanic from 'oceanic.js'

export interface Origins {
  channel: Oceanic.TextChannel
  message: Oceanic.Message
}

export abstract class Base<T, R extends keyof Origins> {
  abstract readonly type: string
  abstract readonly requisites: Array<R>
  readonly data: T

  constructor (data: T) {
    this.data = data
  }

  abstract execute (data: Pick<Origins, R>): Promise<Partial<Origins>>
}
