import test from 'ava'
import sinon from 'sinon'
import {
  inspect
} from 'util'
import PseudoClient from '../../../test/pdc.js'
import QueryBuilder from 'simple-knex'
import {
  _CommandHandler as CommandHandler,
  _ReactionHandler as ReactionHandler,
  Await,
  ReactCommand,
  ReactInterface
} from '../'

require('dotenv').config()

const {
  DATABASE_URL
} = process.env

function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

const knex = new QueryBuilder({
  connection: DATABASE_URL,
  client: 'pg',
  pool: {
    min: 1,
    max: 1
  }
})

const botOwner = new PseudoClient.User({ id: '1' })
const otherUser = new PseudoClient.User({ id: '2' })

const client = new PseudoClient(undefined, botOwner)

client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })

const dGuild = client.guilds.get('0')

const dChannel = dGuild.channels.get('0')
const otherChannel = dGuild._createChannel({ id: '1', name: 'otherChannel' })
const restrictedChannel = dGuild._createChannel({ id: '2', name: 'restrictedChannel' })
const nonTextChannel = dGuild._createChannel({ id: '3', name: 'restrictedChannel' })
nonTextChannel.type = 1

dChannel._setPermission(client.user.id, 'sendMessages', true)
dChannel._setPermission(botOwner.id, 'sendMessages', true)

otherChannel._setPermission(client.user.id, 'sendMessages', true)
otherChannel._setPermission(botOwner.id, 'sendMessages', true)

nonTextChannel._setPermission(client.user.id, 'sendMessages', true)
nonTextChannel._setPermission(botOwner.id, 'sendMessages', true)

const mockReactCommands = [
  new ReactCommand({
    emoji: '🍕',
    desc: 'Testing react command differenciation',
    action: () => 'pizza'
  }),
  new ReactCommand({
    emoji: '🍨',
    desc: 'Testing react command differenciation',
    action: () => 'ice cream'
  }),
  new ReactCommand({
    emoji: '🍔',
    desc: 'Testing restricted react commands',
    options: {
      restricted: true
    },
    action: () => 'hamburger'
  }),
  new ReactCommand({
    emoji: '🍬',
    desc: 'Testing designated users',
    options: {
      restricted: true,
      designatedUsers: ['1', '3']
    },
    action: () => 'candy'
  }),
  new ReactCommand({
    emoji: '🍎',
    desc: 'Testing database requesting',
    options: {
      dbTable: 'cyclonereactcommandhandler'
    },
    action: ({ userData }) => userData.id
  }),
  new ReactCommand({
    emoji: '🍓',
    desc: 'Testing multiple responses',
    action: () => ['first', 'second']
  }),
  new ReactCommand({
    emoji: '🧀',
    desc: 'Testing restricted channels',
    action: () => {
      return {
        content: 'cheese',
        options: {
          channel: restrictedChannel.id
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🌮',
    desc: 'Testing no return',
    action: () => undefined
  }),
  new ReactCommand({
    emoji: '🌭',
    desc: 'Testing returning an empty object',
    action: () => {
      return {}
    }
  }),
  new ReactCommand({
    emoji: '🎂',
    desc: 'Just embed',
    action: () => {
      return {
        embed: {
          name: 'embed'
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍿',
    desc: 'Just file',
    action: () => {
      return {
        file: {
          name: 'file',
          file: Buffer.from('hello')
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍩',
    desc: 'All three',
    action: () => {
      return {
        content: 'content',
        embed: {
          name: 'embed'
        },
        file: {
          name: 'file',
          file: Buffer.from('hello')
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍞',
    desc: 'Returning an invalid file',
    action: () => {
      return {
        file: {
          name: 'file',
          file: 1
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍪',
    desc: 'Testing sending messages in custom channels',
    action: () => {
      return {
        content: 'content',
        options: {
          channel: otherChannel.id
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🥞',
    desc: 'Test long messages',
    action: () => 'f'.repeat(2001)
  }),
  new ReactCommand({
    emoji: '🍝',
    desc: 'Test long embeds',
    action: () => {
      return {
        embed: {
          name: 'test',
          fields: [
            {
              name: 'test',
              value: 'f'.repeat(1025)
            }
          ]
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍏',
    desc: 'Testing invalid form bodies',
    action: () => {
      return {
        embed: {
          fields: [
            {
              value: 'f'
            }
          ]
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🥓',
    desc: 'Testing awaited messages',
    action: () => {
      return {
        content: 'content',
        options: {
          wait: new Await({
            action: () => 'await content'
          })
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍫',
    desc: 'Testing react interfaces',
    action: () => {
      return {
        content: 'content',
        options: {
          reactInterface: new ReactInterface({
            buttons: [
              new ReactCommand({
                emoji: '🥔',
                action: () => 'potato'
              }),
              new ReactCommand({
                emoji: '🍕',
                action: () => 'new pizza'
              })
            ]
          })
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🥚',
    desc: 'Testing removeReaction',
    options: {
      removeReaction: true
    },
    action: () => 'remove the reaction for this'
  }),
  new ReactCommand({
    emoji: '🍗',
    desc: 'Return a self destruct react interface',
    action: () => {
      return {
        content: 'content',
        options: {
          reactInterface: new ReactInterface({
            buttons: [
              new ReactCommand({
                emoji: '🥔',
                action: () => 'button'
              })
            ],
            options: {
              deleteAfterUse: true
            }
          })
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍭',
    desc: 'Delete response after 100 ms',
    action: () => {
      return {
        content: 'content',
        options: {
          deleteAfter: 100
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🌯',
    desc: 'Invalid deleteAfter delay',
    action: () => {
      return {
        content: 'content',
        options: {
          deleteAfter: 'string'
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🥖',
    desc: 'deleteAfter with no response',
    action: () => {
      return {
        options: {
          deleteAfter: 100
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍵',
    desc: 'Return an invalid react interface',
    action: () => {
      return {
        content: 'content',
        options: {
          reactInterface: 'string'
        }
      }
    }
  }),
  new ReactCommand({
    emoji: '🍣',
    desc: 'React interface with no response',
    action: () => {
      return {
        options: {
          reactInterface: new ReactInterface({
            buttons: new ReactCommand({
              emoji: '🍕',
              action: () => 'button'
            })
          })
        }
      }
    }
  })
]

const handler = new ReactionHandler({
  client,
  ownerID: botOwner.id,
  knex,
  reactCommands: mockReactCommands
})

async function _prepareTable () {
  if (!(await knex.listTables()).includes('cyclonecommandhandler')) {
    return knex.createTable({
      name: 'cyclonereactcommandhandler',
      columns: [
        {
          name: 'id',
          type: 'string',
          primary: true
        }
      ]
    }).then(async ({ name }) => {
      if (!(await knex.select(name).length)) {
        return knex.insert({
          table: name,
          data: {
            id: client.user.id
          }
        })
          .catch((ignore) => ignore)
          .then(() => {
            return knex.insert({
              table: name,
              data: {
                id: botOwner.id
              }
            }).catch((ignore) => ignore)
          })
      }
    })
  }
}

test.before(async (t) => {
  t.context.message = await dChannel.createMessage('hello')
})

test.serial('invalidSimple-KnexSupply', async (t) => {
  const fakeHandler = new ReactionHandler({
    client,
    ownerId: botOwner.id,
    reactCommands: mockReactCommands
  })

  return t.throwsAsync(fakeHandler.handle(t.context.message, await t.context.message.addReaction('🍎'), botOwner), {
    instanceOf: Error,
    message: 'QueryBuilder was not supplied to ReactionHandler! Attempted to fetch table:\ncyclonereactcommandhandler'
  })
})

test.serial('invalidCommandInstance', (t) => {
  let error

  const invalidReactCommand = 1

  try {
    error = new ReactionHandler({
      client,
      ownerId: botOwner.id,
      reactCommands: invalidReactCommand
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied react command not a ReactCommand instance:\n1'))
})

test.serial('reactCommandDescrimination', async (t) => {
  const pizza = await handler.handle(t.context.message, await t.context.message.addReaction('🍕'), botOwner)

  t.truthy(pizza, 'Valid return')
  t.is(pizza.results[0].response.content, 'pizza', 'Pizza react command ran')

  t.is((await handler.handle(t.context.message, await t.context.message.addReaction('🍨'), botOwner)).results[0].response.content, 'ice cream', 'Ice cream react command ran')

  t.is(await handler.handle(t.context.message, await t.context.message.addReaction('🍟'), botOwner), undefined, 'Unknown react command')

  const spy = sinon.spy(t.context.message.channel, 'createMessage')

  const {
    results
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🍕'), botOwner)

  t.true(spy.calledWith({ content: 'pizza', embed: undefined }, undefined), 'Response sent to channel')

  t.is(results.length, 1, 'Only 1 result')

  spy.restore()
})

test.serial('customChannel', async (t) => {
  await handler.handle(t.context.message, await t.context.message.addReaction('🍪'), botOwner)

  t.truthy(otherChannel.messages.find((m) => m.content === 'content'))
})

test.serial('responseErrors', async (t) => {
  const longContent = await t.context.message.addReaction('🥞')
  const longEmbed = await t.context.message.addReaction('🍝')
  const invalidEmbed = await t.context.message.addReaction('🍏')
  const spy = sinon.spy(t.context.message.channel, 'createMessage')

  await handler.handle(t.context.message, longContent, botOwner)
  await handler.handle(t.context.message, longEmbed, botOwner)
  await t.throwsAsync(handler.handle(t.context.message, invalidEmbed, botOwner), {
    instanceOf: Error,
    name: 'DiscordRESTError [50035]',
    message: 'Invalid Form Body\n  embed.fields.0.name: This field is required',
    code: 50035
  }, 'Invalid form')

  t.true(spy.calledWith('Text was too long, sent as a file instead.', {
    name: 'Command Result.txt',
    file: Buffer.from(`${'f'.repeat(2001)}\n\nundefined`)
  }), 'Message too long')

  t.true(spy.calledWith('Text was too long, sent as a file instead.', {
    name: 'Command Result.txt',
    file: Buffer.from(`undefined\n\n${inspect({ name: 'test', fields: [{ name: 'test', value: 'f'.repeat(1025) }] })}`)
  }), 'Embed too long')

  spy.restore()
})

test.serial('ignoreCodes', async (t) => {
  const invalidChannelReactCommand = new ReactCommand({
    emoji: '🍕',
    desc: 'Send a message to a non-text channel',
    action: () => {
      return {
        content: 'content',
        options: {
          channel: nonTextChannel.id
        }
      }
    }
  })

  const fakeHandler = new ReactionHandler({
    agent: {},
    client,
    ownerID: botOwner.id,
    reactCommands: invalidChannelReactCommand,
    options: {
      ignoreCodes: [50008]
    }
  })

  const {
    results: [result]
  } = await fakeHandler.handle(t.context.message, await t.context.message.addReaction('🍕'), botOwner)

  t.deepEqual(result, {
    options: {
      channel: nonTextChannel.id
    },
    response: undefined
  })
})

test.serial('uncachedMessages', async (t) => {
  delete t.context.message.content
  delete t.context.message.embeds

  const results = await handler.handle(t.context.message, await t.context.message.addReaction('🍕'), botOwner)
  t.is(results, undefined)

  t.context.message.content = 'hello'
  t.context.message.embeds = []
})

test.serial('restrictedReactCommands', async (t) => {
  t.context.message.author = botOwner

  const authorFailure = await handler.handle(t.context.message, await t.context.message.addReaction('🍔'), otherUser)
  t.is(authorFailure, undefined, 'Message author only failure')

  const authorSuccess = await handler.handle(t.context.message, await t.context.message.addReaction('🍔'), botOwner)
  t.is(authorSuccess.results[0].response.content, 'hamburger', 'Message author only failure')

  const designatedFailure = await handler.handle(t.context.message, await t.context.message.addReaction('🍬'), otherUser)
  t.is(designatedFailure, undefined, 'Designated users failure')

  const designatedSuccess = await handler.handle(t.context.message, await t.context.message.addReaction('🍬'), botOwner)
  t.is(designatedSuccess.results[0].response.content, 'candy', 'Designated users success')

  t.context.message.author = client.user
})

test.serial('singleDataSupply', (t) => {
  const singleReactCommand = new ReactCommand({
    emoji: '🍕',
    desc: 'This is a single react command',
    action: () => ''
  })

  const fakeHandler = new ReactionHandler({
    client,
    ownerId: botOwner.id,
    reactCommands: singleReactCommand
  })

  t.truthy(fakeHandler._reactCommands.get('🍕'))
})

test.serial('invalidReactCommandAction', async (t) => {
  const fakeHandler = new ReactionHandler({
    client: PseudoClient,
    reactCommands: new ReactCommand({
      emoji: '🍕',
      desc: 'A fake react command',
      action: 1
    })
  })

  const results = fakeHandler.handle(t.context.message, await t.context.message.addReaction('🍕'), botOwner)

  return t.throwsAsync(results, {
    instanceOf: TypeError,
    message: 'React command action is not a function:\n🍕'
  })
})

test.serial('databaseRequesting', async (t) => {
  return _prepareTable().then(async () => {
    const first = await handler.handle(t.context.message, await t.context.message.addReaction('🍎'), client.user)
    const second = await handler.handle(t.context.message, await t.context.message.addReaction('🍎'), botOwner)

    t.is(first.results[0].response.content, '0', 'User 0')
    t.is(second.results[0].response.content, '1', 'User 1')
  })
})

test.serial('multipleResponses', async (t) => {
  const { results } = await handler.handle(t.context.message, await t.context.message.addReaction('🍓'), botOwner)

  t.is(results[0].response.content, 'first', 'First response')

  t.is(results[1].response.content, 'second', 'Second response')
})

test.serial('noMessageSendPermission', async (t) => {
  t.deepEqual(await handler.handle(t.context.message, await t.context.message.addReaction('🧀'), botOwner), {
    command: mockReactCommands.find((rC) => rC.emoji === '🧀'),
    reactInterface: undefined,
    results: [{
      options: {
        channel: restrictedChannel.id
      }
    }]
  })

  t.context.message.channel._setPermission(client.user.id, 'sendMessages', false)

  t.deepEqual(await handler.handle(t.context.message, await t.context.message.addReaction('🍕'), botOwner), {
    command: mockReactCommands.find((rC) => rC.emoji === '🍕'),
    reactInterface: undefined,
    results: [{
      options: {}
    }]
  })

  t.context.message.channel._setPermission(client.user.id, 'sendMessages', true)
})

test.serial('noResponse', async (t) => {
  t.deepEqual(await handler.handle(t.context.message, await t.context.message.addReaction('🌮'), botOwner), {
    command: mockReactCommands.find((rC) => rC.emoji === '🌮'),
    reactInterface: undefined,
    results: [{
      options: {}
    }]
  })
})

test.serial('partialReturnObject', async (t) => {
  const {
    results: [{ response: contentResponse }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🍕'), botOwner)
  t.is(contentResponse.content, 'pizza', 'Just content pt. 1')
  t.deepEqual(contentResponse.embeds, [], 'Just content pt. 2')
  t.deepEqual(contentResponse.attachments, [], 'Just content pt. 3')

  const {
    results: [{ response: embedResponse }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🎂'), botOwner)
  t.is(embedResponse.content, undefined, 'Just embed pt. 1')
  t.deepEqual(embedResponse.embeds, [{
    name: 'embed'
  }], 'Just embed pt. 2')
  t.deepEqual(embedResponse.attachments, [], 'Just embed pt. 3')

  const {
    results: [{ response: fileResponse }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🍿'), botOwner)
  t.is(fileResponse.content, undefined, 'Just file pt. 1')
  t.deepEqual(fileResponse.embeds, [], 'Just file pt. 2')
  t.deepEqual(fileResponse.attachments, [{
    filename: 'file',
    url: `https://cdn.discordapp.com/attachments/${dGuild.id}/${t.context.message.channel.id}/file`
  }], 'Just file pt. 3')
  t.deepEqual(fileResponse._attachmentFile, Buffer.from('hello'), 'File pt. 4')

  t.deepEqual(await handler.handle(t.context.message, await t.context.message.addReaction('🌭'), botOwner), {
    command: mockReactCommands.find((rC) => rC.emoji === '🌭'),
    reactInterface: undefined,
    results: []
  }, 'Empty object')
})

test.serial('fullReturnObject', async (t) => {
  const {
    results: [{ response }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🍩'), botOwner)

  t.is(response.content, 'content', 'Content')

  t.deepEqual(response.embeds, [{
    name: 'embed'
  }], 'Embed')

  t.deepEqual(response.attachments, [{
    filename: 'file',
    url: `https://cdn.discordapp.com/attachments/${dGuild.id}/${t.context.message.channel.id}/file`
  }], 'File pt. 1')
  t.deepEqual(response._attachmentFile, Buffer.from('hello'), 'File pt. 2')
})

test.serial('invalidFile', async (t) => {
  return t.throwsAsync(handler.handle(t.context.message, await t.context.message.addReaction('🍞'), botOwner), {
    instanceOf: TypeError,
    message: 'Supplied file not a Buffer instance:\nfile'
  })
})

test.serial('interfaceSystem', async (t) => {
  const {
    results: [{ response }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🍫'), botOwner)

  t.is(response.content, 'content', 'Response content')

  t.truthy(handler._reactInterfaces.get(response.id), 'Interface bound')

  t.truthy(response.reactions['🥔'], 'Buttons added pt. 1')
  t.truthy(response.reactions['🍕'], 'Buttons added pt. 2')

  const {
    results: [{
      response: buttonResponse
    }]
  } = await handler.handle(response, await response.addReaction('🥔'), botOwner)

  t.is(buttonResponse.content, 'potato', 'Button response')

  const {
    results: [{
      response: existingReactCommandButtonResponse
    }]
  } = await handler.handle(response, await response.addReaction('🍕'), botOwner)

  t.is(existingReactCommandButtonResponse.content, 'new pizza', 'Button has same emoji as a react command')

  const fakeHandler = new ReactionHandler({
    client,
    ownerID: botOwner.id
  })

  fakeHandler.bindInterface(t.context.message, new ReactInterface({
    buttons: [
      new ReactCommand({
        emoji: ':emoji:123',
        action: () => 'button'
      }),
      new ReactCommand({
        emoji: 'a:animated:1234',
        action: () => 'animated button'
      })
    ]
  }))

  const {
    results: [{
      response: customEmojiResponse
    }]
  } = await fakeHandler.handle(t.context.message, {
    name: 'emoji',
    id: '123'
  }, botOwner)

  t.is(customEmojiResponse.content, 'button', 'Custom emoji')

  const {
    results: [{
      response: animatedCustomEmojiResponse
    }]
  } = await fakeHandler.handle(t.context.message, {
    animated: true,
    name: 'animated',
    id: '1234'
  }, botOwner)

  t.is(animatedCustomEmojiResponse.content, 'animated button', 'Animated custom emoji')

  await t.throwsAsync(handler.handle(t.context.message, await t.context.message.addReaction('🍵'), botOwner), {
    instanceOf: TypeError,
    message: 'Supplied react interface is not a ReactInterface instance:\nstring'
  }, 'Invalid react interface')

  return t.throwsAsync(handler.handle(t.context.message, await t.context.message.addReaction('🍣'), botOwner), {
    instanceOf: Error,
    message: 'Cannot attach an interface to a non-existent response.'
  }, 'Attempted to add a react interface to non-existent response')
})

test.serial('maxInterfacesLessThanThree', async (t) => {
  const fakeHandler = new ReactionHandler({
    client,
    ownerID: botOwner.id,
    options: {
      maxInterfaces: 2
    }
  })

  t.is(fakeHandler._maxInterfaces, 3)
})

test.serial('maxInterfacesReached', async (t) => {
  const fakeHandler = new ReactionHandler({
    client,
    ownerID: botOwner.id,
    options: {
      maxInterfaces: 9
    }
  })

  const reactInterface = new ReactInterface({
    buttons: new ReactCommand({
      emoji: '🥔',
      action: () => 'button'
    })
  })

  for (let i = 0; i < 10; i++) fakeHandler._reactInterfaces.set(String(i), 1)

  await fakeHandler.bindInterface(t.context.message, reactInterface)

  for (let i = 0; i < 3; i++) t.is(fakeHandler._reactInterfaces.get(String(i)), undefined, `Three deleted (${i})`)

  for (let i = 3; i < 10; i++) t.is(fakeHandler._reactInterfaces.get(String(i)), 1, `Six remain (${i})`)

  t.deepEqual(fakeHandler._reactInterfaces.get(t.context.message.id), reactInterface, 'Interface registered')
})

test.serial('removeReaction', async (t) => {
  const {
    results: [{ response }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🥚'), botOwner)

  t.is(response.content, 'remove the reaction for this', 'Proper content')

  t.is(response.reactions['🥚'], undefined, 'Reaction removed')

  t.context.message._removeReactionError = true

  const {
    results: [{
      response: ignoredErrorResponse
    }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🥚'), botOwner)

  t.is(ignoredErrorResponse.content, 'remove the reaction for this', 'Proper content before error')

  t.truthy(t.context.message.reactions['🥚'], 'Error ignored')

  t.context.message._removeReactionError = false
})

test.serial('deleteAfter', async (t) => {
  const {
    results: [{ response }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🍭'), botOwner)

  t.is(response.content, 'content', 'Proper content')

  await delay(200)

  t.is(response.channel.messages.find((m) => m.id === response.id), undefined, 'Message deleted')

  await t.throwsAsync(handler.handle(t.context.message, await t.context.message.addReaction('🌯'), botOwner), {
    instanceOf: TypeError,
    message: 'Supplied deleteAfter delay is not a number:\nstring'
  }, 'deleteAfter is not a number')

  return t.throwsAsync(handler.handle(t.context.message, await t.context.message.addReaction('🥖'), botOwner), {
    instanceOf: Error,
    message: 'Cannot delete a non-existent response with a delay of:\n100'
  }, 'Attempted to add a delete delay to non-existent response')
})

test.serial('deleteAfterUse', async (t) => {
  const {
    results: [{ response }]
  } = await handler.handle(t.context.message, await t.context.message.addReaction('🍗'), botOwner)

  t.is(response.content, 'content', 'Proper content')

  const {
    results: [{
      response: buttonResponse
    }]
  } = await handler.handle(response, await response.addReaction('🥔'), botOwner)

  t.is(buttonResponse.content, 'button', 'Button worked')

  t.is(handler._reactInterfaces.get(response.id), undefined, 'Interface unregistered')

  t.is(response.reactions['🥔'].count, 1, 'User (second) reaction removed')
})

test.serial('awaits', async (t) => {
  const noCommandHandler = new ReactionHandler({
    client,
    ownerID: botOwner.id,
    reactCommands: mockReactCommands
  })
  const _commandHandler = new CommandHandler({
    client,
    ownerID: botOwner.id
  })
  const yesCommandHandler = new ReactionHandler({
    client,
    ownerID: botOwner.id,
    reactCommands: mockReactCommands
  })
  yesCommandHandler._agent._commandHandler = _commandHandler
  _commandHandler._agent = yesCommandHandler._agent

  await yesCommandHandler.handle(t.context.message, await t.context.message.addReaction('🥓'), botOwner)
  t.truthy(_commandHandler._awaits.get(`${t.context.message.channel.id}${botOwner.id}`), 'Await registered')

  return t.throwsAsync(noCommandHandler.handle(t.context.message, await t.context.message.addReaction('🥓'), botOwner), {
    instanceOf: Error,
    message: 'The command handler isn\'t enabled; enable it by passing an empty array to Agent.commands.'
  }, 'No reaction handler')
})

test.after.always((t) => knex.dropTable('cyclonereactcommandhandler').catch((ignore) => ignore))
