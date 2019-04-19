import test from 'ava'
import Command from './'

const command = new Command({
  name: 'command',
  desc: 'Testing command info',
  options: {
    args: [{ name: 'mandatoryArg', mand: true }, { name: 'customDelimArg', delim: '|', mand: true }, { name: 'optionalArg' }]
  },
  action: () => ''
})

const lastArgDelimCommand = new Command({
  name: 'ladm',
  desc: 'Testing when the last arg has a delim',
  options: {
    args: [{ name: 'arg', delim: '|' }]
  },
  action: () => ''
})

test('commandInfo', async (t) => {
  t.is(command.info, '**command <mandatoryArg> <customDelimArg>|(optionalArg)** - *Testing command info*', 'Regular')

  t.is(lastArgDelimCommand.info, '**ladm (arg)** - *Testing when the last arg has a delim*', 'Last arg has a delim')
})
