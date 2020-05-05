import test from 'ava'
import ReactCommand from '.'

test('designatedUsersIsString', (t) => {
  const reactCommand = new ReactCommand({
    options: {
      restricted: true,
      designatedUsers: '1'
    }
  })

  t.deepEqual(reactCommand.options.designatedUsers, ['1'])
})

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
