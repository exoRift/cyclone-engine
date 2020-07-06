import test from 'ava'
import sinon from 'sinon'
import Agent from './'

import PseudoClient from '../../test/pdc.js'

import {
  Command,
  Replacer,
  ReactCommand,
  ReactInterface
} from '../structures/'

import {
  IgnoredError
} from '../errors/'

const errorTest = Error('This is a fake command error')
const noStackErrorTest = Error('This is a fake stackless command error')
delete noStackErrorTest.stack

const baseCommand = new Command({
  name: 'c1',
  desc: 'A test command',
  action: () => 'command1'
})
const baseReplacer = new Replacer({
  key: 'r1',
  desc: 'A test replacer',
  action: () => 'replacer1'
})
const baseReactCommand = new ReactCommand({
  emoji: '🍕',
  desc: 'Pizza',
  action: () => 'pizza'
})

test.before((t) => {
  t.context.spies = {
    log: sinon.spy(console, 'log'),
    error: sinon.spy(console, 'error')
  }
})

test.beforeEach((t) => {
  t.context.initClock = () => {
    t.context.clock = sinon.useFakeTimers(Date.now())
  }

  t.context.init = (handlerData, options) => {
    t.context.offlineInit(handlerData, options)

    return t.context.agent.connect()
  }

  t.context.offlineInit = (handlerData, options) => {
    t.context.agent = new Agent({
      Eris: PseudoClient,
      handlerData,
      options
    })

    t.context.guilds = {
      dGuild: t.context.agent.client._joinGuild({ guildData: { id: '0' } })
    }

    t.context.users = {
      otherUser: t.context.agent.client._addUser({ id: '1' }, t.context.guilds.dGuild)
    }

    t.context.channels = {
      dChannel: t.context.guilds.dGuild._createChannel({ id: '0', name: 'dChannel' }),
      otherChannel: t.context.guilds.dGuild._createChannel({ id: '1', name: 'otherChannel' }),
      restrictedChannel: t.context.guilds.dGuild._createChannel({ id: '2', name: 'restrictedChannel' })
    }

    for (const channel in t.context.channels) sinon.spy(t.context.channels[channel], 'createMessage')

    t.context.channels.restrictedChannel._setPermission(t.context.agent.client.user.id, 'sendMessages', false)
  }
})

test.afterEach.always((t) => {
  if (t.context.clock) t.context.clock.restore()

  if (t.context.channels) for (const channel in t.context.channels) t.context.channels[channel].createMessage.restore()
})

test.after.always((t) => {
  for (const spy in t.context.spies) t.context.spies[spy].restore()
})

test('statusEdited', async (t) => {
  const supplies = [
    undefined,
    'status',
    (editStatus, agent, shard) => {
      editStatus(shard)
      editStatus(shard + 1)
    }
  ]

  const checks = [
    {
      name: 'Prefix: \'!\'',
      type: 2
    },
    {
      name: 'status'
    },
    [0, 1]
  ]

  const checkNames = [
    'Default status',
    'Custom status',
    'Function status'
  ]

  for (let s = 0; s < supplies.length; s++) {
    t.context.offlineInit(undefined, {
      statusMessage: supplies[s]
    })

    const spy = sinon.spy(t.context.agent.client.shards.get(0), 'editStatus')

    await t.context.agent.client.connect()

    if (Array.isArray(checks[s])) {
      for (let pt = 0; pt < checks[s].length; pt++) t.true(spy.calledWith(checks[s][pt]), `${checkNames[s]} pt. ${pt + 1}`)
    } else t.true(spy.calledWith(checks[s]), checkNames[s])

    spy.restore()
  }
})

test('messageEvent', async (t) => {
  await t.context.init({
    commands: [
      baseCommand,
      new Command({
        name: 'commanderrortest',
        desc: 'Testing when a command throws an error',
        action: async () => {
          throw errorTest
        }
      }),
      new Command({
        name: 'nostackerrortest',
        desc: 'Testing when an error is thrown without a stack',
        action: () => {
          throw noStackErrorTest
        }
      })
    ]
  })

  const messages = {
    proper: new PseudoClient.Message(t.context.channels.dChannel, '!c1', undefined, t.context.users.otherUser),
    bot: new PseudoClient.Message(t.context.channels.dChannel, '!c1', undefined, t.context.agent.client.user),
    error: new PseudoClient.Message(t.context.channels.dChannel, '!commanderrortest', undefined, t.context.users.otherUser),
    noStackError: new PseudoClient.Message(t.context.channels.dChannel, '!nostackerrortest', undefined, t.context.users.otherUser),
    createMessageError: new PseudoClient.Message(t.context.channels.dChannel, '!c1', undefined, t.context.users.otherUser)
  }
  messages.bot.author.bot = true

  const spy = sinon.spy(t.context.agent.commandHandler, 'handle')

  t.context.agent.client.emit('messageCreate', messages.proper)
  t.true(spy.calledWith(messages.proper), 'Proper message')

  t.context.agent.client.emit('messageCreate', messages.bot)
  t.false(spy.calledWith(messages.bot), 'Bot message')

  await t.context.agent._onMessage(messages.error)
  t.true(messages.error.channel.createMessage.calledWith('ERR:\n```\nThis is a fake command error```\n```\n' + errorTest.stack + '```'), 'Command error')

  await t.context.agent._onMessage(messages.noStackError)
  t.true(messages.noStackError.channel.createMessage.calledWith('ERR:\n```\nThis is a fake stackless command error```'), 'Command error without a stack')

  messages.createMessageError.channel._createMessageThrow = true
  await t.context.agent._onMessage(messages.createMessageError)
  t.true(t.context.spies.error.calledWith(sinon.match.has('message', 'This is purposefully thrown')), 'Error send failure')
  t.true(t.context.spies.error.calledWith('Error in error handler: '), 'Error send failure message fail pt. 1')
  t.true(t.context.spies.error.calledWith(sinon.match.has('message', 'This is purposefully thrown')), 'Error send failure message fail pt. 2')
  messages.createMessageError.channel._createMessageThrow = false
})

test('buildHelp', async (t) => {
  const helpContent = {
    author: {
      name: 'client v1 Help',
      icon_url: 'https://raw.githubusercontent.com/exoRift/cyclone-engine/master/assets/Help%20Icon.png'
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
      text: 'Prefix: "!" or mention | <> = Mandatory () = Optional | # = Number / @ = User / [#] = Channel'
    }
  }
  const commands = [
    baseCommand,
    new Command({
      name: 'second',
      desc: 'A test command with args',
      options: {
        args: [{ name: 'mand', mand: true }, { name: 'custom', mand: true, delim: '|' }, { name: 'opt' }]
      },
      action: () => ''
    }),
    new Command({
      name: 'restricted',
      desc: 'A restricted command',
      options: {
        restricted: true
      },
      action: () => 'nope'
    })
  ]
  const replacers = [
    baseReplacer,
    new Replacer({
      key: 'second',
      desc: 'A test replacer with args',
      options: {
        args: [{ name: 'mand', mand: true }, { name: 'otherMand', mand: true, delim: '|' }, { name: 'opt' }, { name: 'num', type: 'number' }]
      },
      action: () => ''
    })
  ]
  const reactCommands = [
    baseReactCommand,
    new ReactCommand({
      emoji: '🍨',
      desc: 'Ice cream',
      action: () => 'ice cream'
    }),
    new ReactCommand({
      emoji: '🍟',
      desc: 'No fries for u (restricted)',
      options: {
        restricted: true
      },
      action: () => 'hehe'
    })
  ]

  const helpData = {
    desc: 'desc',
    serverCode: 'code',
    color: 1,
    footerImage: 'prefix image',
    version: '1'
  }

  const supplies = [
    {
      commands
    },
    {
      commands,
      replacers
    },
    {
      commands,
      replacers,
      reactCommands
    },
    {
      replacers
    }
  ]

  const checks = {
    commands: '**c1** - *A test command*\n**second** **<mand> <custom>|(opt)** - *A test command with args*',
    replacers: '**Replacers:**\n*Inserts live data values into commands. `|REPLACERNAME|`*\n\n**r1** - *A test replacer*\n**second** **<mand> <otherMand>|(opt) (#num)** - *A test replacer with args*',
    reactCommands: '**React Commands:**\n*React to any message with the appropriate reaction to trigger its command.*\n\n**🍕** - *Pizza*\n**🍨** - *Ice cream*'
  }

  const checkNames = [
    'Just commands (No page supplied)',
    'Commands and replacers',
    'Commands, replacers, and react commands',
    'No commands (With replacers)'
  ]

  for (let s = 0; s < supplies.length; s++) {
    await t.context.init(supplies[s])

    let i = 1

    for (const section in supplies[s]) {
      const {
        embed,
        options,
        pages
      } = t.context.agent.buildHelp(helpData, !s ? undefined : i)

      helpContent.fields = [{
        name: `Commands page ${i} out of ${Object.keys(supplies[s]).length}`,
        value: checks[section]
      }]

      t.deepEqual(embed, helpContent, `${checkNames[s]}: ${section} page`)
      t.deepEqual(pages, Object.entries(checks).reduce((a, [key, content]) => Object.keys(supplies[s]).includes(key) ? a.concat(content) : a, []), `${checkNames[s]}: pages match`)
      if (pages.length > 1) t.true(options.reactInterface instanceof ReactInterface, `Interface returned: ${section} page`)
      else t.deepEqual(options, { reactInterface: undefined }, `Options empty: ${section} page`)

      i++
    }
  }

  await t.context.init({
    commands
  })

  const lowerPage = t.context.agent.buildHelp(helpData, 0)
  helpContent.fields = [{
    name: 'Commands page 1 out of 1',
    value: checks.commands
  }]
  t.deepEqual(lowerPage.embed, helpContent, 'Page less than 0')

  const higherPage = t.context.agent.buildHelp(helpData, 2)
  t.deepEqual(higherPage.embed, helpContent, 'Page more than length')

  const longCommands = [
    new Command({
      name: 'longcommand',
      desc: '1'.repeat(1002),
      action: () => 'action'
    }),
    new Command({
      name: 'secondlongcommand',
      desc: '2'.repeat(1002),
      action: () => 'action'
    })
  ]

  await t.context.init({
    commands: longCommands
  })

  const multipleCommandPages1 = t.context.agent.buildHelp(helpData, 1)
  const multipleCommandPages2 = t.context.agent.buildHelp(helpData, 2)

  helpContent.fields = [{
    name: 'Commands page 1 out of 2',
    value: '**longcommand** - *' + longCommands[0].desc + '*'
  }]
  t.deepEqual(multipleCommandPages1.embed, helpContent, 'Multiple command pages: page 1')

  helpContent.fields = [{
    name: 'Commands page 2 out of 2',
    value: '**secondlongcommand** - *' + longCommands[1].desc + '*'
  }]
  t.deepEqual(multipleCommandPages2.embed, helpContent, 'Multiple command pages: page 2')

  t.context.offlineInit()

  t.throws(() => t.context.agent.buildHelp(helpData), 'Could not get OAuth app info. Please start the bot with `Agent.connect()`', 'No OAuth error')
})

test('helpMenuInterface', async (t) => {
  await t.context.init({
    commands: [
      new Command({
        name: 'help',
        desc: 'Display a help menu',
        action: ({ agent }) => agent.buildHelp({})
      })
    ],
    replacers: baseReplacer,
    reactCommands: []
  })

  const msg = (await t.context.agent.commandHandler.handle(await t.context.channels.dChannel.createMessage('!help'))).results[0].responses[0]

  t.is(msg.channel.messages.get(msg.id).embeds[0].fields[0].name, 'Commands page 1 out of 2', 'Help menu created')

  await t.context.agent.reactionHandler.handle(msg, await msg.addReaction('↪'), t.context.users.otherUser)
  t.is(msg.channel.messages.get(msg.id).embeds[0].fields[0].name, 'Commands page 2 out of 2', 'Page advanced')

  await t.context.agent.reactionHandler.handle(msg, await msg.addReaction('↩'), t.context.users.otherUser)
  t.is(msg.channel.messages.get(msg.id).embeds[0].fields[0].name, 'Commands page 1 out of 2', 'Page reversed')
})

test('buildHelpEmptyData', async (t) => {
  await t.context.init({
    commands: baseCommand
  })

  t.deepEqual(t.context.agent.buildHelp({}).embed, {
    author: {
      name: 'client Help',
      icon_url: 'https://raw.githubusercontent.com/exoRift/cyclone-engine/master/assets/Help%20Icon.png'
    },
    title: 'Made by owner',
    url: undefined,
    thumbnail: {
      url: 'https://cdn.discordapp.com/avatars/0/0.jpg?size=undefined'
    },
    color: 0,
    description: undefined,
    fields: [
      {
        name: 'Commands page 1 out of 1',
        value: '**c1** - *A test command*'
      }
    ],
    footer: {
      icon_url: undefined,
      text: 'Prefix: "!" or mention | <> = Mandatory () = Optional | # = Number / @ = User / [#] = Channel'
    }
  })
})

test('buildHelpNoData', (t) => {
  t.context.offlineInit({
    commands: baseCommand
  })

  t.notThrows(() => t.context.agent.buildHelp())
  t.deepEqual(t.context.agent.buildHelp(), {
    embed: undefined,
    options: {
      reactInterface: undefined
    },
    pages: ['**c1** - *A test command*']
  })
})

test('helpCache', async (t) => {
  await t.context.init()

  t.context.agent._helpCache = ['test']
  t.deepEqual(t.context.agent.buildHelp({}).pages, ['test'], 'Cache loaded')

  t.context.agent.resetHelpCache()
  t.deepEqual(t.context.agent._helpCache, [], 'Cache successfully cleared')
})

test('lastMessage', async (t) => {
  await t.context.init()

  await t.context.channels.dChannel.createMessage('first')
  await t.context.channels.dChannel.createMessage('last')

  t.is(t.context.agent.lastMessage(t.context.channels.dChannel).content, 'last')
})

test('ErisErrorRecievedEvent', (t) => {
  const error = new Error('This is a test error')

  t.context.offlineInit()

  t.context.agent.client.emit('error', error)

  t.true(t.context.spies.error.calledWith('An error has occured:', error))
})

test('disconnection', async (t) => {
  t.context.offlineInit()

  const statusSpy = sinon.spy(t.context.agent.client.shards.get(0), 'editStatus')

  await t.context.agent.client.connect()

  t.true(statusSpy.calledWith({
    name: 'Prefix: \'!\'',
    type: 2
  }), 'Status edited')

  t.context.agent.client.emit('shardDisconnect', undefined, 0)

  t.true(t.context.spies.log.calledWith('Shard 0 lost connection. Error:\nundefined'), 'Disconnection logged')

  statusSpy.restore()
})

test('postMessageFunction', async (t) => {
  await t.context.init({
    commands: baseCommand
  }, {
    postMessageFunction: (msg, { results: [{ responses: [{ content }] }] }) => console.log(msg.channel.id + ' ' + content)
  })

  const message = new PseudoClient.Message(t.context.channels.dChannel, '!c1', undefined, t.context.users.otherUser)

  await t.context.agent._onMessage(message)

  t.true(t.context.spies.log.calledWith('0 command1'))
})

test('postReactionFunction', async (t) => {
  await t.context.init({
    reactCommands: baseReactCommand
  }, {
    postReactionFunction: (msg, emoji, user, { results: [{ responses: [{ content }] }] }) => console.log(`${msg.channel.id} ${emoji.name} ${user.id} ${content}`)
  })

  const message = await t.context.channels.dChannel.createMessage('hello')

  await t.context.agent._onReaction(message, await message.addReaction('🍕'), t.context.users.otherUser.id)

  t.true(t.context.spies.log.calledWith('0 🍕 1 pizza'))
})

test('fireOnEdit', async (t) => {
  await t.context.init({
    commands: baseCommand
  }, {
    fireOnEdit: true
  })

  const spy = sinon.spy(t.context.agent.commandHandler, 'handle')

  const message = new PseudoClient.Message(t.context.channels.dChannel, '!c1', undefined, t.context.users.otherUser)

  t.context.agent.client.emit('messageUpdate', message)

  t.true(spy.calledWith(message))

  spy.restore()
})

test('noCommandHandler', async (t) => {
  await t.context.init()

  const spy = sinon.spy(t.context.agent, '_onMessage')

  t.context.agent.client.emit('messageCreate')

  t.false(spy.called)

  spy.restore()
})

test('noReactionHandler', async (t) => {
  await t.context.init()

  const spy = sinon.spy(t.context.agent, '_onReaction')

  t.context.agent.client.emit('messageReactionAdd')

  t.false(spy.called)

  spy.restore()
})

test('reactionEvent', async (t) => {
  await t.context.init({
    reactCommands: [
      baseReactCommand,
      new ReactCommand({
        emoji: '🍧',
        desc: 'Second react command',
        action: () => 'ice cream'
      }),
      new ReactCommand({
        emoji: '🍟',
        desc: 'Throw an error',
        action: async () => {
          throw errorTest
        }
      })
    ]
  })

  const message = await t.context.channels.dChannel.createMessage('message')
  const botMessage = await t.context.channels.otherChannel.createMessage('message')

  const spy = sinon.spy(t.context.agent.reactionHandler, 'handle')

  const properEmoji = await message.addReaction('🍕')
  t.context.agent.client.emit('messageReactionAdd', message, properEmoji, t.context.users.otherUser.id)
  t.true(spy.calledWith(message, properEmoji, message.channel.guild.members.get(t.context.users.otherUser.id)), 'Proper message')

  const botEmoji = await message.addReaction('🍧')
  await t.context.agent._onReaction(botMessage, botEmoji, t.context.agent.client.user.id)
  t.true(botMessage.channel.createMessage.calledOnce, 'Bot message')

  const errorEmoji = await message.addReaction('🍟')
  await t.context.agent._onReaction(message, errorEmoji, t.context.users.otherUser.id)

  t.true(message.channel.createMessage.calledWith('ERR:\n```\nThis is a fake command error```\n```\n' + errorTest.stack + '```'), 'React command error')
})

test('fireOnReactionRemove', async (t) => {
  await t.context.init({
    reactCommands: baseReactCommand
  }, {
    fireOnReactionRemove: true
  })

  const spy = sinon.spy(t.context.agent.reactionHandler, 'handle')

  const message = await t.context.channels.dChannel.createMessage('hello')

  t.context.agent.client.emit('messageReactionRemove', message, {
    name: '🍕'
  }, t.context.users.otherUser.id)

  t.true(spy.calledWith(message, {
    name: '🍕'
  }, t.context.guilds.dGuild.members.get(t.context.users.otherUser.id)))
})

test('compileInfoDefaultsArray', (t) => {
  t.context.offlineInit()

  t.deepEqual(t.context.agent._compileInfo(baseCommand), [baseCommand.info])
})

test('compileInfoNoAdditionsToHeader', (t) => {
  t.context.offlineInit()

  t.deepEqual(t.context.agent._compileInfo([], 'hello'), [])
})

test('ignoredError', async (t) => {
  t.context.offlineInit()

  const err = new IgnoredError('ignored error')

  t.is(await t.context.agent._handleError(err), undefined)
})

test('attachmentSystem', async (t) => {
  await t.context.init({
    commands: new Command({
      name: 'testattachment',
      desc: 'Test if attachments are passed to commands',
      action: ({ agent }) => agent.attachments.attachment
    }),
    reactCommands: new ReactCommand({
      emoji: '🍕',
      desc: 'Test if attachments are passed to react commands',
      action: ({ agent }) => agent.attachments.attachment
    })
  })

  t.context.agent.attach('attachment', 'hello')

  t.is((await t.context.agent.commandHandler.handle(await t.context.channels.dChannel.createMessage('!testattachment'))).results[0].responses[0].content, 'hello', 'Command handler')

  const message = await t.context.channels.dChannel.createMessage('message')

  t.is((await t.context.agent.reactionHandler.handle(message, await message.addReaction('🍕'), t.context.users.otherUser)).results[0].responses[0].content, 'hello', 'Reaction handler')
})

test('removingAttachments', (t) => {
  t.context.offlineInit()

  t.context.agent.attach('attachment', 'hello')

  t.is(t.context.agent.attachments.attachment, 'hello', 'Attachment added')

  t.context.agent.detach('attachment')

  t.is(t.context.agent.attachments.attachment, undefined, 'Attachment removed')
})

test('attachExistingAttachment', (t) => {
  t.context.offlineInit()

  t.context.agent.attach('existing', 'hello')

  t.throws(() => t.context.agent.attach('existing', 'goodbye'), 'An attachment with that name is already added')
})

test('permissionsSystem', async (t) => {
  const initialPermissions = {
    '0': {
      '0': 2
    }
  }

  await t.context.init({
    commands: new Command({
      name: 'testpermissions',
      desc: 'Test permission levels',
      options: {
        authLevel: 3
      },
      action: () => 'success'
    }),
    reactCommands: new ReactCommand({
      emoji: '🍕',
      desc: 'Test permission levels',
      options: {
        authLevel: 3
      },
      action: () => {
        return 'react success'
      }
    })
  }, {
    guildOptions: {
      permissions: initialPermissions
    }
  })

  t.deepEqual(t.context.agent.guildData.permissions, initialPermissions, 'Inital permissions set')

  const secondUser = t.context.agent.client._addUser({ id: '2' }, t.context.guilds.dGuild)

  t.context.guilds.dGuild._giveRole(t.context.users.otherUser.id, '0')
  t.context.guilds.dGuild._giveRole(t.context.users.otherUser.id, '1')
  t.context.guilds.dGuild._giveRole(t.context.users.otherUser.id, '2')
  t.context.guilds.dGuild._giveRole(secondUser.id, '0')

  t.context.agent.updatePermission(t.context.guilds.dGuild.id, '0', 1)
  t.context.agent.updatePermission(t.context.guilds.dGuild.id, '1', 4)
  t.context.agent.updatePermission(t.context.guilds.dGuild.id, '2', 2)

  t.is(t.context.agent.getTopPermissionLevel(t.context.users.otherUser), 4, 'Successfully got the top level')

  t.context.guilds.dGuild.owner = t.context.users.otherUser.id
  t.is(t.context.agent.getTopPermissionLevel(t.context.users.otherUser), Infinity, 'Sever owner level')
  delete t.context.guilds.dGuild.owner

  const message = await t.context.channels.dChannel.createMessage('!testpermissions')

  message.author = secondUser
  message.member = secondUser
  await t.context.agent._onMessage(message)
  t.false(message.channel.createMessage.calledWith({ content: 'success', embed: undefined }, undefined), 'Does not meet level threshold (command handler)')

  message.author = t.context.users.otherUser
  message.member = t.context.users.otherUser
  await t.context.agent._onMessage(message)
  t.true(message.channel.createMessage.calledWith({ content: 'success', embed: undefined }, undefined), 'Meet level threshold (command handler)')

  await t.context.agent._onReaction(message, await message.addReaction('🍕'), secondUser.id)
  t.false(message.channel.createMessage.calledWith({ content: 'react success', embed: undefined }, undefined), 'Does not meet level threshold (reaction handler)')

  await t.context.agent._onReaction(message, await message.addReaction('🍕'), t.context.users.otherUser.id)
  t.true(message.channel.createMessage.calledWith({ content: 'react success', embed: undefined }, undefined), 'Meet level threshold (reaction handler)')

  const nonMember = new PseudoClient.User({ id: '3' })
  t.throws(() => t.context.agent.getTopPermissionLevel(nonMember), 'Provided user is not a Member instance. (Did you provide a User instance instead?)', 'Provided user not member errors')
})

test('updatePermissionErrors', (t) => {
  t.context.offlineInit()

  t.throws(() => t.context.agent.updatePermission('nonexistent guild'), 'An ID to a guild the bot isn\'t in was provided. ID: nonexistent guild', 'Non-existent guild')
  t.throws(() => t.context.agent.updatePermission(t.context.guilds.dGuild.id, 'nonexistent role'), 'An ID to a role that doesn\'t exist was provided. ID: nonexistent role', 'Non-existent role')

  const role = '0'
  t.context.guilds.dGuild._giveRole(t.context.users.otherUser.id, '0')
  t.throws(() => t.context.agent.updatePermission(t.context.guilds.dGuild.id, role, 'noninteger'), '\'noninteger\' is not a valid level. A level must be a valid integer', 'Invalid level')

  const secondRole = t.context.guilds.dGuild._giveRole(t.context.users.otherUser.id, '1')
  t.context.agent.updatePermission(t.context.guilds.dGuild.id, role, 3)
  t.context.agent.updatePermission(t.context.guilds.dGuild.id, secondRole, 3)
  t.true(t.context.spies.log.calledWith('WARNING: Multiple roles in guild \'0\' have been assigned level 3'), 'Multiple roles with same level')
})

test('intents', (t) => {
  t.context.offlineInit()

  t.deepEqual(t.context.agent.client._intents, [
    'MESSAGE_CREATE',
    'MESSAGE_UPDATE',
    'MESSAGE_DELETE'
  ], 'Base intents')

  t.context.offlineInit({
    reactCommands: []
  })

  t.deepEqual(t.context.agent.client._intents, [
    'MESSAGE_CREATE',
    'MESSAGE_UPDATE',
    'MESSAGE_DELETE',

    'MESSAGE_REACTION_ADD',
    'MESSAGE_REACTION_REMOVE'
  ], 'Reaction intents')

  t.context.offlineInit(undefined, {
    intents: 'TEST_INTENT'
  })

  t.deepEqual(t.context.agent.client._intents, [
    'MESSAGE_CREATE',
    'MESSAGE_UPDATE',
    'MESSAGE_DELETE',

    'TEST_INTENT'
  ], 'Custom intents')
})

test('settingPrefixes', async (t) => {
  t.context.offlineInit()

  t.context.agent.setGuildPrefix(t.context.guilds.dGuild.id, '>')

  t.deepEqual(t.context.agent.guildData.prefixes, {
    [t.context.guilds.dGuild.id]: '>'
  }, 'Agent storage modified')

  await t.context.init({
    commands: baseCommand
  })

  t.context.agent.setGuildPrefix(t.context.guilds.dGuild.id, '.')

  t.deepEqual(t.context.agent.commandHandler._options.guildPrefixes, {
    [t.context.guilds.dGuild.id]: '.'
  }, 'Handler storage modified')
})
