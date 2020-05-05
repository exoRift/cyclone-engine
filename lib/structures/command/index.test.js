import test from 'ava'
import Command from './'

const command = new Command({
  name: 'command',
  desc: 'Testing command info',
  options: {
    args: [{ name: 'mandatoryArg', mand: true }, { name: 'customDelimArg', delim: '|', mand: true }, { name: 'optionalArg' }, { name: 'numberArg', type: 'number' }]
  }
})

const lastArgDelimCommand = new Command({
  name: 'ladc',
  desc: 'Testing when the last arg has a delim',
  options: {
    args: [{ name: 'arg', delim: '|' }]
  }
})

const restrictedCommand = new Command({
  name: 'restrictedcommand',
  desc: 'A restricted command',
  options: {
    restricted: true
  }
})

test('commandInfo', (t) => {
  t.is(command.info, '**command** **<mandatoryArg> <customDelimArg>|(optionalArg) (#numberArg)** - *Testing command info*', 'Regular')

  t.is(lastArgDelimCommand.info, '**ladc** **(arg)** - *Testing when the last arg has a delim*', 'Last arg has a delim')
})

test('restrictedCommandInfo', (t) => {
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
