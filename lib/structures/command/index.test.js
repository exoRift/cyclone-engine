import test from 'ava'

import Command from './'

const baseCommand = new Command({
  name: 'command',
  desc: 'Testing command info',
  options: {
    args: [{ name: 'mandatoryArg', mand: true }, { name: 'customDelimArg', delim: '|', mand: true }, { name: 'optionalArg' }, { name: 'numberArg', type: 'number' }]
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

  t.is(baseCommand.info, '**command** **<mandatoryArg> <customDelimArg>|(optionalArg) (#numberArg)** - *Testing command info*', 'Regular')

  t.is(lastArgDelimCommand.info, '**ladc** **(arg)** - *Testing when the last arg has a delim*', 'Last arg has a delim')
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
