import test from 'ava'
import ReactCommand from '.'

test('restrictedCommandInfo', (t) => {
  const reactCommand = new ReactCommand({
    emoji: '🍕',
    desc: 'A restricted react command',
    options: {
      restricted: true
    }
  })

  t.is(reactCommand.info, '~~**🍕** - *A restricted react command*~~')
})

test('defaults', (t) => {
  const reactCommand = new ReactCommand({
    emoji: '🍕',
    desc: 'Testing parameter defaults'
  })

  t.is(reactCommand.options.authLevel, 0, 'Auth level')
})
