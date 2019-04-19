import test from 'ava'
import Await from '.'

test('No options supplied', (t) => {
  function action () {
    return '1'
  }
  const wait = new Await({
    action
  })

  t.is(wait.action, action, 'Action')
  t.is(wait.timeout, 15000, 'Timeout')
  t.is(wait.check(), true, 'Check')
})
