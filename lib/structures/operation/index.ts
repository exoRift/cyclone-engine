import * as BaseOp from './base'
import * as MessageOp from './message'
import * as ExpireOp from './expire'
import * as InterfaceOp from './modifier/interface'

export namespace Operation {
  export import Base = BaseOp.Base // eslint-disable-line @typescript-eslint/no-unused-vars
  export import Message = MessageOp.Message // eslint-disable-line @typescript-eslint/no-unused-vars
  export import Expire = ExpireOp.Expire // eslint-disable-line @typescript-eslint/no-unused-vars
  export import Interface = InterfaceOp.Interface // eslint-disable-line @typescript-eslint/no-unused-vars
}

export {
  OperationType
} from './base'
export {
  MessageOperationData
} from './message'
export {
  InterfaceComponent
} from './modifier/interface'
