import {
  Agent
} from 'agent/'

/** The requisites for something to be processed as an action */
interface Action {
  _identifier: string /** Whatever identifies this action for it to be executed */
}

/** A base action handler */
class BaseHandler<T extends Action> {
  private _agent: Agent /** The parent agent */

  actions: Map<string, T> = new Map() /** The registered actions */

  /**
   * Construct a handler
   * @param {Agent} agent The parent agent
   */
  constructor (agent: Agent) {
    this._agent = agent
  }

  // todo: throws jsdoc. Maybe custom errors?
  /**
   * Register an action to be ready to be listened for
   * @param  {Action} action The action
   */
  registerAction (action: T): void {
    if (this.actions.has(action._identifier)) throw Error('action already registered')

    this.actions.set(action._identifier, action)
  }

  executeAction () { // todo

  }
}

export default BaseHandler

export {
  Action,
  BaseHandler
}
