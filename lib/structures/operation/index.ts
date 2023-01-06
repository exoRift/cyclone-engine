import * as BaseOp from './base'
import * as MessageOp from './message'

export namespace Operation {
  export import Base = BaseOp.Base // eslint-disable-line @typescript-eslint/no-unused-vars
  export import Message = MessageOp.Message // eslint-disable-line @typescript-eslint/no-unused-vars
}

export {
  Origins
} from './base'
export {
  MessageOperationData
} from './message'
