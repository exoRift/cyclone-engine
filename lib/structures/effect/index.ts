import * as BaseEffect from './base'
import * as CommandEffect from './command'

export * from './base'
export * from './command'

// NOTE: This is necessary to have an Effect namespace with Base and Command without also taking CommandData
export namespace Effect {
  export import Base = BaseEffect.Base // eslint-disable-line @typescript-eslint/no-unused-vars
  export import Command = CommandEffect.Command // eslint-disable-line @typescript-eslint/no-unused-vars
}
