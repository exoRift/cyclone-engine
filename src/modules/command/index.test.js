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

test('commandInfo', async (t) => {
  t.is(command.info, '**command <mandatoryArg> <customDelimArg>|(optionalArg)** - *Testing command info*', 'Command info')
})
