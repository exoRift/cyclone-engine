import test from 'ava'
import Replacer from '.'

const replacer = new Replacer({
  key: 'replacer',
  desc: 'A test replacer',
  options: {
    args: [{ name: 'mandatoryArg', mand: true }, { name: 'customDelimArg', delim: '|', mand: true }, { name: 'optionalArg' }]
  }
})

const lastArgDelimReplacer = new Replacer({
  key: 'ladr',
  desc: 'Testing when the last arg has a delim',
  options: {
    args: [{ name: 'arg', delim: '|' }]
  },
  action: () => ''
})

test('replacerInfo', (t) => {
  t.is(replacer.info, '**replacer <mandatoryArg> <customDelimArg>|(optionalArg)** - *A test replacer*', 'Regular')

  t.is(lastArgDelimReplacer.info, '**ladr (arg)** - *Testing when the last arg has a delim*', 'Last arg has a delim')
})
