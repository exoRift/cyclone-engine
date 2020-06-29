import test from 'ava'

import BaseHandler from './'

import PseudoClient from '../../../test/pdc.js'

test.beforeEach((t) => {
  t.context.client = new PseudoClient()

  t.context.guilds = {
    dGuild: t.context.client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  }

  t.context.channels = {
    dChannel: t.context.guilds.dGuild.channels.get('0'),
    restrictedChannel: t.context.guilds.dGuild._createChannel({ id: '2', name: 'restrictedChannel' }),
    nonTextChannel: t.context.guilds.dGuild._createChannel({ id: '3', name: 'nonTextChannel' })
  }
  t.context.channels.nonTextChannel.type = 2

  t.context.channels.restrictedChannel._setPermission(t.context.client.user.id, 'sendMessages', false)

  t.context.handler = new BaseHandler({
    client: t.context.client,
    ownerID: '0'
  })
})

test('validatingChannels', (t) => {
  t.true(t.context.handler.validateChannel(t.context.channels.dChannel), 'Valid channel')

  t.false(t.context.handler.validateChannel(undefined), 'No channel')

  t.false(t.context.handler.validateChannel(t.context.channels.nonTextChannel), 'Invalid channel type')

  t.false(t.context.handler.validateChannel(t.context.channels.restrictedChannel), 'Restricted channel')

  t.false(t.context.handler.validateChannel(new PseudoClient.Channel({ id: '4', name: 'nonexistent' })), 'Nonexistent channel')
})
