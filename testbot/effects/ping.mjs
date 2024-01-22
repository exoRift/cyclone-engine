import { Effect } from 'cyclone-engine'
import { ApplicationCommandTypes } from 'oceanic.js'

const ping = new Effect.Command({
  name: 'ping',
  description: 'Ping the bot',
  type: ApplicationCommandTypes.CHAT_INPUT,
  action: (req, res) => {
    res.message('Pong!')
  }
})

export default ping
