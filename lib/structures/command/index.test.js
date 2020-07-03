import test from 'ava'

import Command from './'

const baseCommand = new Command({
  name: 'command',
  desc: 'Testing command info',
  options: {
    args: [{ name: 'mandatoryArg', mand: true }, { name: 'customDelimArg', delim: '|', mand: true }, { name: 'optionalArg' }]
  }
})

test('commandInfo', (t) => {
  const lastArgDelimCommand = new Command({
    name: 'ladc',
    desc: 'Testing when the last arg has a delim',
    options: {
      args: [{ name: 'arg', delim: '|' }]
    }
  })

  t.is(baseCommand.info, '**command** **<mandatoryArg> <customDelimArg>|(optionalArg)** - *Testing command info*', 'Regular')

  t.is(lastArgDelimCommand.info, '**ladc** **(arg)** - *Testing when the last arg has a delim*', 'Last arg has a delim')
})

test('commandTypeInfo', (t) => {
  const types = [
    {
      name: 'number',
      prefix: '#'
    },
    {
      name: 'user',
      prefix: '@'
    },
    {
      name: 'channel',
      prefix: '[#]'
    }
  ]

  const typedCommand = new Command({
    name: 'tcommand',
    desc: 'A typed command',
    options: {
      args: types.map((t) => {
        t.type = t.name

        return t
      })
    }
  })

  t.is(typedCommand.info, `**tcommand** **${types.reduce((a, t) => a.concat((a.length ? ' ' : '') + `(${t.prefix}${t.name})`), '')}** - *A typed command*`)
})

test('restrictedCommandInfo', (t) => {
  const restrictedCommand = new Command({
    name: 'restrictedcommand',
    desc: 'A restricted command',
    options: {
      restricted: true
    }
  })

  t.is(restrictedCommand.info, '~~**restrictedcommand** - *A restricted command*~~')
})

test('aliasesNotAnArray', (t) => {
  const command = new Command({
    name: 'command',
    options: {
      aliases: 'alias'
    }
  })

  t.deepEqual(command.options.aliases, ['alias'])
})

test('aliasInfo', (t) => {
  const command = new Command({
    name: 'command',
    desc: 'description',
    options: {
      args: [{ name: 'arg' }],
      aliases: 'alias'
    }
  })

  t.is(command.info, '**command**|**alias** **(arg)** - *description*')
})
