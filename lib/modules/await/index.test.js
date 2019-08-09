import test from 'ava'
import sinon from 'sinon'
import Await from '.'

test('noSuppliedOptions', (t) => {
  function action () {
    return '1'
  }
  const wait = new Await({
    action
  })

  t.deepEqual(wait.action, action, 'Action')
  t.is(wait.timeout, 15000, 'Timeout')
  t.is(wait.check(), true, 'Check')
})

test('delimLongerThanOne', (t) => {
  const spy = sinon.spy(console, 'error')

  const wait = new Await({
    options: {
      args: [{ name: 'badDelim', delim: '||' }, { name: 'noDelim' }, { name: 'goodDelim', delim: '|' }]
    }
  })

  t.true(spy.calledWith('WARNING: Delimiters that are longer than 1 character will not work:\nbadDelim:', '||'))
  t.false(spy.calledWith('WARNING: Delimiters that are longer than 1 character will not work:\nnoDelim:', undefined))
  t.false(spy.calledWith('WARNING: Delimiters that are longer than 1 character will not work:\ngoodDelim:', '|'))

  spy.restore()

  return wait
})

test('channelSupplied', (t) => {
  const wait = new Await({
    options: {
      channel: '1'
    }
  })

  t.is(wait.channel, '1')
})

test('prematurelyClearingOrRefreshing', async (t) => {
  const wait = new Await({})

  await t.throwsAsync(wait.clear(), {
    instanceOf: Error,
    message: 'You have not started the timer yet!'
  }, 'Clearing')

  return t.throwsAsync(wait.refresh(), {
    instanceOf: Error,
    message: 'You have not started the timer yet!'
  }, 'Refreshing')
})
