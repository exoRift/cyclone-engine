const Command = require('../command')

class Await extends Command {
  constructor (data) {
    super(data)
    const {
      options = {}
    } = data
    const {
      timeout = 15000,
      oneTime,
      check = () => true
    } = options
    this.timeout = timeout
    this.oneTime = oneTime
    this.check = check
  }
}

module.exports = Await
