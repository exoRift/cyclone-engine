import test from 'ava'
import sinon from 'sinon'
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
  t.is(command.info, '**command <mandatoryArg> <customDelimArg>|(optionalArg) (#numberArg)** - *Testing command info*', 'Regular')

  t.is(lastArgDelimCommand.info, '**ladc (arg)** - *Testing when the last arg has a delim*', 'Last arg has a delim')
})

test('restrictedCommandInfo', (t) => {
  t.is(restrictedCommand.info, '~~**restrictedcommand** - *A restricted command*~~')
})

test('delimLongerThanOne', (t) => {
  const spy = sinon.spy(console, 'error')

  const invalidDelimCommand = new Command({
    name: 'invaliddelimcommand',
    desc: 'A command with an arg that has an invalid delimiter',
    options: {
      args: [{ name: 'badDelim', delim: '||' }, { name: 'noDelim' }, { name: 'goodDelim', delim: '|' }]
    }
  })

  t.true(spy.calledWith('WARNING: Delimiters that are longer than 1 character will not work:\nbadDelim:', '||'))
  t.false(spy.calledWith('WARNING: Delimiters that are longer than 1 character will not work:\nnoDelim:', undefined))
  t.false(spy.calledWith('WARNING: Delimiters that are longer than 1 character will not work:\ngoodDelim:', '|'))

  spy.restore()

  return invalidDelimCommand
})

test('aliasesNotAnArray', (t) => {
  const command = new Command({
    name: 'command',
    options: {
      aliases: 'alias'
    }
  })

  t.deepEqual(command.aliases, ['alias'])
})
