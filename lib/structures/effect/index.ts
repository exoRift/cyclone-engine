import * as BaseEf from './base'
import * as CommandEf from './command'

export namespace Effect {
  export import Base = BaseEf.Base // eslint-disable-line @typescript-eslint/no-unused-vars
  export import Command = CommandEf.Command // eslint-disable-line @typescript-eslint/no-unused-vars
}

export {
  EffectData,
  Trigger
} from './base'
export {
  CommandData
} from './command'
