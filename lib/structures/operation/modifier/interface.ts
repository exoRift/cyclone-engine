import { Base } from '../base'
import { Message } from '../message'

export class Expire extends Base<number, 'modifier', typeof Message> {
  readonly type = 'modifier'

  execute (target: Message): void {

  }
}
