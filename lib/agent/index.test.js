import test from 'ava'
import sinon from 'sinon'
import Agent from './'
import {
  Command,
  Replacer,
  ReactCommand
} from '../structures/'
import PseudoClient from '../../test/pdc.js'

const errorTest = Error('This is a fake command error')
const noStackErrorTest = Error('This is a fake stackless command error')
delete noStackErrorTest.stack

const mockCommands = [
  new Command({
    name: 'c1',
    desc: 'A test command',
    action: () => 'command1'
  }),
  new Command({
    name: 'nostackerrortest',
    desc: 'Testing when an error is thrown without a stack',
    action: () => {
      throw noStackErrorTest
    }
  }),
  new Command({
    name: 'commanderrortest',
    desc: 'Testing when a command throws an error',
    action: async () => {
      throw errorTest
    }
  }),
  new Command({
    name: 'restrictedcommand',
    desc: 'Testing restricted commands',
    options: {
      restricted: true
    },
    action: () => 'You shouldn\'t see this'
  })
]

const mockReplacers = [
  new Replacer({
    key: 'r1',
    desc: 'A test replacer',
    action: () => 'replacer1'
  }),
  new Replacer({
    key: 'r2',
    desc: 'A test replacer with args',
    options: {
      args: [{ name: 'mand', mand: true }, { name: 'otherMand', mand: true, delim: '|' }, { name: 'opt' }, { name: 'num', type: 'number' }]
    },
    action: () => 'replacer2'
  })
]

const mockReactCommands = [
  new ReactCommand({
    emoji: '🍕',
    desc: 'Pizza',
    action: () => 'pizza'
  }),
  new ReactCommand({
    emoji: '🍨',
    desc: 'Ice cream',
    action: () => 'ice cream'
  }),
  new ReactCommand({
    emoji: '🍰',
    desc: 'Cake',
    options: {
      restricted: true
    },
    action: () => 'cake'
  }),
  new ReactCommand({
    emoji: '🍔',
    desc: 'Throw an error',
    action: async () => {
      throw errorTest
    }
  })
]

function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

test.beforeEach((t) => {
  t.context.spies = {
    log: sinon.spy(console, 'log'),
    error: sinon.spy(console, 'error')
  }
})

test.afterEach.always((t) => {
  for (const spy in t.context.spies) t.context.spies[spy].restore()
})

test.serial('statusEdited', async (t) => {
  const dAgent = new Agent({
    Eris: PseudoClient
  })
  const cAgent = new Agent({
    Eris: PseudoClient,
    agentOptions: {
      statusMessage: 'status'
    }
  })
  const fAgent = new Agent({
    Eris: PseudoClient,
    agentOptions: {
      statusMessage: (editStatus, shard) => {
        let i = 0
        setInterval(() => {
          i++
          editStatus(String(i))
        }, 100)
      }
    }
  })

  const dStatusSpy = sinon.spy(dAgent._client.shards.get(0), 'editStatus')
  const cStatusSpy = sinon.spy(cAgent._client.shards.get(0), 'editStatus')
  const fStatusSpy = sinon.spy(fAgent._client.shards.get(0), 'editStatus')

  dAgent._client._setConnectStatus(true)
  cAgent._client._setConnectStatus(true)
  await dAgent.connect()
  await cAgent.connect()

  t.true(dStatusSpy.calledWith({
    name: 'Prefix: \'!\'',
    type: 2
  }), 'Default status')

  t.true(cStatusSpy.calledWith({
    name: 'status'
  }), 'Custom status')

  fAgent._client._setConnectStatus(true)
  await fAgent.connect()

  await delay(150)
  t.true(fStatusSpy.calledWith('1'), 'Function status pt. 1')
  await delay(150)
  t.true(fStatusSpy.calledWith('2'), 'Function status pt. 2')
})

test.serial('connectRetryLimit', async (t) => {
  const agent = new Agent({
    Eris: PseudoClient
  })

  const spy = sinon.spy(agent._client, 'connect')

  return agent.connect().then(() => {
    t.true(t.context.spies.error.calledWith('RECONNECTION LIMIT REACHED; RECONNECTION CANCELED'), 'Connection failure logged')
    t.is(spy.callCount, 10, 'Connection failure count')

    return spy.restore()
  })
})

test.serial('loopFunction', async (t) => {
  const spy = sinon.spy()

  const agent = new Agent({
    Eris: PseudoClient,
    agentOptions: {
      loopFunction: {
        func: spy,
        interval: 50
      }
    }
  })

  await delay(110)

  t.true(spy.calledTwice)

  return agent
})

test.serial('messageEvent', (t) => {
  const agent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands
    }
  })

  const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  const dChannel = dGuild.channels.get('0')
  const otherChannel = dGuild._createChannel({ id: '1' })
  const anotherChannel = dGuild._createChannel({ id: '2' })

  const otherUser = agent._client._addUser({ id: '1' })

  dChannel._setPermission(agent._client.user.id, 'sendMessages', true)
  dChannel._setPermission(otherUser.id, 'sendMessages', true)

  otherChannel._setPermission(agent._client.user.id, 'sendMessages', true)
  otherChannel._setPermission(otherUser.id, 'sendMessages', true)

  anotherChannel._setPermission(agent._client.user.id, 'sendMessages', true)
  anotherChannel._setPermission(otherUser.id, 'sendMessages', true)

  return agent._onReady(agent._client).then(async () => {
    const messages = {
      proper: new PseudoClient.Message(dChannel, '!c1', undefined, otherUser),
      bot: new PseudoClient.Message(dChannel, '!c1', undefined, agent._client.user),
      error: new PseudoClient.Message(otherChannel, '!commanderrortest', undefined, otherUser),
      noStackError: new PseudoClient.Message(otherChannel, '!nostackerrortest', undefined, otherUser),
      createMessageError: new PseudoClient.Message(anotherChannel, '!c1', undefined, otherUser)
    }
    sinon.spy(dChannel, 'createMessage')
    sinon.spy(otherChannel, 'createMessage')
    sinon.spy(anotherChannel, 'createMessage')

    const handlerSpy = sinon.spy(agent._commandHandler, 'handle')

    agent._client.emit('messageCreate', messages.proper)
    t.true(handlerSpy.calledWith(messages.proper), 'Proper message')

    messages.bot.author.bot = true
    agent._client.emit('messageCreate', messages.bot)
    t.false(handlerSpy.calledWith(messages.bot), 'Bot message')

    await agent._onMessage(messages.error)
    t.is(messages.error.channel.createMessage.getCall(0).args[0], 'ERR:\n```\nThis is a fake command error```\n```\n' + errorTest.stack + '```', 'Command error')

    await agent._onMessage(messages.noStackError)
    t.is(messages.noStackError.channel.createMessage.getCall(1).args[0], 'ERR:\n```\nThis is a fake stackless command error```', 'Command error without a stack')

    messages.createMessageError.channel._createMessageThrow = true
    await agent._onMessage(messages.createMessageError)
    t.is(t.context.spies.error.getCall(0).args[0].message, 'This is purposefully thrown', 'Error send failure')
    t.is(t.context.spies.error.getCall(1).args[0], 'Error in error handler: ', 'Error send failure message fail pt. 1')
    t.is(t.context.spies.error.getCall(1).args[1].message, 'This is purposefully thrown', 'Error send failure message fail pt. 2')

    dChannel.createMessage.restore()
    otherChannel.createMessage.restore()
    anotherChannel.createMessage.restore()
    return handlerSpy.restore()
  })
})

test.serial('noCommandHandler', async (t) => {
  const agent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands
    }
  })

  const otherUser = agent._client._addUser({ id: '1' })

  const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  const dChannel = dGuild.channels.get('0')

  const msg = await dChannel.createMessage('!c1')
  msg.author = otherUser

  const results = agent._onMessage(msg)

  t.is(results, undefined)
})

test.serial('buildHelp', async (t) => {
  const helpData = {
    description: 'desc',
    supportServerInviteCode: 'code',
    color: 1,
    prefixImage: 'prefix image',
    version: '1'
  }
  const helpContent = {
    author: {
      name: 'client 1 Help',
      icon_url: 'https://raw.githubusercontent.com/mets11rap/cyclone-engine/master/assets/Help Icon.png'
    },
    title: '*[Click for support]* Made by owner',
    url: 'https://discord.gg/code',
    description: 'desc',
    thumbnail: {
      url: 'https://cdn.discordapp.com/avatars/0/0.jpg?size=undefined'
    },
    color: 1,
    footer: {
      icon_url: 'prefix image',
      text: 'Prefix: "!" or mention | <> = Mandatory () = Optional # = Arg is a number'
    }
  }
  const commandFields = [{
    name: 'Commands page 1 out of 1',
    value: '**c1** - *A test command*\n**nostackerrortest** - *Testing when an error is thrown without a stack*\n**commanderrortest** - *Testing when a command throws an error*'
  }]
  const replacerFields = [{
    name: 'Commands page 2 out of 2',
    value: '**Replacers:**\n*Inserts live data values into commands. `|REPLACERNAME|`*\n\n**r1** - *A test replacer*\n**r2 <mand> <otherMand>|(opt) (#num)** - *A test replacer with args*'
  }]
  const reactCommandFields = [{
    name: 'Commands page 3 out of 3',
    value: '**React Commands:**\n*React to any message with the appropriate reaction to trigger its command.*\n\n**🍕** - *Pizza*\n**🍨** - *Ice cream*\n**🍔** - *Throw an error*'
  }]

  const cAgent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands
    }
  })

  const cCommands = await cAgent.buildHelp(helpData)

  helpContent.fields = commandFields
  t.deepEqual(cCommands, helpContent, 'Just commands')

  const cRAgent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands,
      replacers: mockReplacers
    }
  })

  const cRCommands = await cRAgent.buildHelp(helpData)

  helpData.page = 2
  const cRReplacers = await cRAgent.buildHelp(helpData)

  commandFields[0].name = 'Commands page 1 out of 2'
  helpContent.fields = commandFields
  t.deepEqual(cRCommands, helpContent, 'Commands and replacers: commands page')

  helpContent.fields = replacerFields
  t.deepEqual(cRReplacers, helpContent, 'Commands and replacers: replacers page')

  const cRRCAgent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands,
      replacers: mockReplacers,
      reactCommands: mockReactCommands
    }
  })

  helpData.page = 1
  const cRRCCommands = await cRRCAgent.buildHelp(helpData)

  helpData.page = 2
  const cRRCReplacers = await cRRCAgent.buildHelp(helpData)

  helpData.page = 3
  const cRRCReactCommands = await cRRCAgent.buildHelp(helpData)

  commandFields[0].name = 'Commands page 1 out of 3'
  helpContent.fields = commandFields
  t.deepEqual(cRRCCommands, helpContent, 'Commands, replacers, and react commands: commands page')

  replacerFields[0].name = 'Commands page 2 out of 3'
  helpContent.fields = replacerFields
  t.deepEqual(cRRCReplacers, helpContent, 'Commands, replacers, and react commands: replacers page')

  helpContent.fields = reactCommandFields
  t.deepEqual(cRRCReactCommands, helpContent, 'Commands, replacers, and react commands: replacers page')

  commandFields[0].name = 'Commands page 1 out of 1'
  helpContent.fields = commandFields

  helpData.page = 0
  const page0 = await cAgent.buildHelp(helpData)
  t.deepEqual(page0, helpContent, 'Page less than 1')

  helpData.page = 2
  const page2 = await cAgent.buildHelp(helpData)
  t.deepEqual(page2, helpContent, 'Page more than length')

  const noCommandsAgent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      replacers: mockReplacers
    }
  })

  const noCommandsReplacers = await noCommandsAgent.buildHelp(helpData)

  replacerFields[0].name = 'Commands page 1 out of 1'
  helpContent.fields = replacerFields
  t.deepEqual(noCommandsReplacers, helpContent, 'No commands')

  const restrictedReactCommandAgent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands,
      reactCommands: new ReactCommand({
        emoji: '🍕',
        desc: 'No pizza for u',
        options: {
          restricted: true
        },
        action: () => 'hehe'
      })
    }
  })

  const restrictedReactCommandCommands = await restrictedReactCommandAgent.buildHelp(helpData)

  helpData.page = 2
  const restrictedReactCommandReactCommands = await restrictedReactCommandAgent.buildHelp(helpData)

  commandFields[0].name = 'Commands page 1 out of 1'
  helpContent.fields = commandFields
  t.deepEqual(restrictedReactCommandCommands, helpContent, '1 React command and it\'s restricted: Commands page')
  t.deepEqual(restrictedReactCommandReactCommands, helpContent, '1 React command and it\'s restricted: React commands page')

  const multipleCommandPagesAgent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: new Array(2).fill(new Command({
        name: 'longcommand',
        desc: 'f'.repeat(1002),
        action: () => 'action'
      }))
    }
  })

  helpData.page = 1
  const multipleCommandPages1 = await multipleCommandPagesAgent.buildHelp(helpData)
  helpData.page = 2
  const multipleCommandPages2 = await multipleCommandPagesAgent.buildHelp(helpData)

  commandFields[0].name = 'Commands page 1 out of 2'
  commandFields[0].value = '**longcommand** - *' + 'f'.repeat(1002) + '*'
  helpContent.fields = commandFields
  t.deepEqual(multipleCommandPages1, helpContent, 'Multiple command pages page 1')

  commandFields[0].name = 'Commands page 2 out of 2'
  t.deepEqual(multipleCommandPages2, helpContent, 'Multiple command pages page 2')
})

test.serial('lastMessage', async (t) => {
  const agent = new Agent({
    Eris: PseudoClient
  })

  const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  const dChannel = dGuild.channels.get('0')

  await dChannel.createMessage('hello')

  t.is(agent.lastMessage(dChannel).content, 'hello')
})

test.serial('ErisErrorRecievedEvent', (t) => {
  const error = new Error('This is a test error')
  const agent = new Agent({
    Eris: PseudoClient
  })

  agent._client.emit('error', error)

  t.true(t.context.spies.error.calledWith('An error has occured:', error))
})

test.serial('disconnection', async (t) => {
  const agent = new Agent({
    Eris: PseudoClient
  })

  const statusSpy = sinon.spy(agent._client.shards.get(0), 'editStatus')
  const connectSpy = sinon.spy(agent, 'connect')

  agent._client._setConnectStatus(true)
  await agent.connect()
  t.true(statusSpy.calledWith({
    name: 'Prefix: \'!\'',
    type: 2
  }), 'Status edited')

  agent._client.emit('shardDisconnect', undefined, 0)

  t.true(t.context.spies.log.calledWith('Shard 0 lost connection. Error:\nundefined'), 'Disconnection logged')
  t.true(connectSpy.calledTwice, 'Reconnected')

  connectSpy.restore()
  statusSpy.restore()
})

test.serial('postMessageFunction', async (t) => {
  const agent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands
    },
    agentOptions: {
      postMessageFunction: (msg, { results: [{ responses: [{ content }] }] }) => console.log(msg.channel.id + ' ' + content)
    }
  })

  agent._client._setConnectStatus(true)
  await agent.connect()

  const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  const dChannel = dGuild.channels.get('0')

  const otherUser = agent._client._addUser({ id: '1' })

  dChannel._setPermission(agent._client.user.id, 'sendMessages', true)
  dChannel._setPermission(otherUser.id, 'sendMessages', true)

  const message = new PseudoClient.Message(dChannel, '!c1', undefined, otherUser)

  await agent._onMessage(message)

  t.true(t.context.spies.log.calledWith('0 command1'))
})

test.serial('postReactionFunction', async (t) => {
  const agent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      reactCommands: mockReactCommands
    },
    agentOptions: {
      postReactionFunction: (msg, emoji, user, { results: [{ responses: [{ content }] }] }) => console.log(`${msg.channel.id} ${emoji.name} ${user.id} ${content}`)
    }
  })

  agent._client._setConnectStatus(true)
  await agent.connect()

  const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  const dChannel = dGuild.channels.get('0')

  const otherUser = agent._client._addUser({ id: '1' })

  dChannel._setPermission(agent._client.user.id, 'sendMessages', true)
  dChannel._setPermission(otherUser.id, 'sendMessages', true)

  const message = await dChannel.createMessage('hello')

  await agent._onReaction(message, await message.addReaction('🍕'), otherUser.id)

  t.true(t.context.spies.log.calledWith('0 🍕 1 pizza'))
})

test.serial('fireOnEdit', async (t) => {
  const oldFunc = Agent.prototype._onMessage
  Agent.prototype._onMessage = sinon.spy()

  const agent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands
    },
    agentOptions: {
      fireOnEdit: true
    }
  })
  agent._client._setConnectStatus(true)
  await agent.connect()

  const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  const dChannel = dGuild.channels.get('0')

  const msg = await dChannel.createMessage('!c1')

  agent._client.emit('messageUpdate', msg)

  t.true(agent._onMessage.calledWith(msg))

  Agent.prototype._onMessage = oldFunc
})

test.serial('noReactionHandler', async (t) => {
  const agent = new Agent({
    Eris: PseudoClient
  })

  const otherUser = agent._client._addUser({ id: '1' })

  const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  const dChannel = dGuild.channels.get('0')

  const msg = await dChannel.createMessage('message')

  const results = agent._onReaction(msg, await msg.addReaction('🍕'), otherUser.id)

  t.is(results, undefined)
})

test.serial('reactionEvent', (t) => {
  const agent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      reactCommands: mockReactCommands
    }
  })

  return agent._onReady(agent._client).then(async () => {
    const otherUser = agent._client._addUser({ id: '1' })

    const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
    const dChannel = dGuild.channels.get('0')

    const msg = await dChannel.createMessage('message')

    const channelSpy = sinon.spy(msg.channel, 'createMessage')

    const handlerSpy = sinon.spy(agent._reactionHandler, 'handle')

    const properEmoji = await msg.addReaction('🍕')
    agent._client.emit('messageReactionAdd', msg, properEmoji, otherUser.id)
    t.true(handlerSpy.calledWith(msg, properEmoji, otherUser), 'Proper message')

    const botEmoji = await msg.addReaction('🍨')
    await agent._onReaction(msg, botEmoji, agent._client.user.id)
    t.false(channelSpy.calledWith({
      content: 'ice cream',
      embed: undefined
    }, undefined), 'Bot message')

    const errorEmoji = await msg.addReaction('🍔')
    await agent._onReaction(msg, errorEmoji, otherUser.id)

    t.true(channelSpy.calledWith('ERR:\n```\nThis is a fake command error```\n```\n' + errorTest.stack + '```'), 'React command error')
  })
})

test.serial('fireOnReactionRemove', (t) => {
  const agent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      reactCommands: mockReactCommands
    },
    agentOptions: {
      fireOnReactionRemove: true
    }
  })

  return agent._onReady(agent._client).then(async () => {
    const handlerSpy = sinon.spy(agent._reactionHandler, 'handle')

    const otherUser = agent._client._addUser({ id: '1' })

    const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
    const dChannel = dGuild.channels.get('0')

    const msg = dChannel.createMessage('hello')

    agent._client.emit('messageReactionRemove', msg, {
      name: '🍕'
    }, otherUser.id)

    t.true(handlerSpy.calledWith(msg, {
      name: '🍕'
    }, otherUser))
  })
})

test.serial('userBlacklist', (t) => {
  const agent = new Agent({
    Eris: PseudoClient,
    handlerData: {
      commands: mockCommands,
      reactCommands: mockReactCommands
    },
    agentOptions: {
      userBlacklist: ['2']
    }
  })

  return agent._onReady(agent._client).then(async () => {
    const commandHandlerSpy = sinon.spy(agent._commandHandler, 'handle')
    const reactionHandlerSpy = sinon.spy(agent._reactionHandler, 'handle')

    const goodUser = agent._client._addUser({ id: '1' })
    const blacklistedUser = agent._client._addUser({ id: '2' })

    const dGuild = agent._client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
    const dChannel = dGuild.channels.get('0')

    const message = await dChannel.createMessage('!c1')

    message.author = goodUser
    await agent._onMessage(message)
    t.true(commandHandlerSpy.calledWith(message), 'Good user message')

    message.author = blacklistedUser
    await agent._onMessage(message)
    t.false(reactionHandlerSpy.calledWith(message), 'Blacklisted user message')

    const reaction = await message.addReaction('🍕')

    await agent._onReaction(message, reaction, goodUser.id)
    t.true(reactionHandlerSpy.calledWith(message, reaction, goodUser), 'Good user reaction')

    await agent._onReaction(message, reaction, blacklistedUser.id)
    t.false(reactionHandlerSpy.calledWith(message, reaction, blacklistedUser), 'Blacklisted user reaction')
  })
})
