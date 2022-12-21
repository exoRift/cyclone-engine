import Interaction from './interaction'

abstract class Effect {
  static readonly Interaction = Interaction

  abstract _identifier: string
}

export default Effect

export {
  Effect
}
