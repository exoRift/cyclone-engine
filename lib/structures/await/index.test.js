import test from 'ava'
import sinon from 'sinon'
import Await from '.'

test.before((t) => {
  t.context.clock = sinon.useFakeTimers()
})

test.after.always((t) => {
  t.context.clock.restore()
})

test('noSuppliedOptions', (t) => {
  function action () {
    return '1'
  }
  const wait = new Await({
    action
  })

  t.deepEqual(wait.action, action, 'Action')
  t.is(wait.options.timeout, 15000, 'Timeout')
  t.is(wait.options.check(), true, 'Check')
})

test('channelSupplied', (t) => {
  const wait = new Await({
    options: {
      channel: '1'
    }
  })

  t.is(wait.options.channel, '1')
})

test('prematurelyClearingOrRefreshing', (t) => {
  const wait = new Await({})

  t.throws(() => wait.clear(), 'You have not started the timer yet!', 'Clearing')

  t.throws(() => wait.refresh(), 'You have not started the timer yet!', 'Refreshing')
})

test('cancelFunction', (t) => {
  const awaitMap = new Map()

  const spy = sinon.spy()

  const id = '00'

  const wait = new Await({
    options: {
      timeout: 5,
      onCancelFunction: spy
    }
  })

  awaitMap.set(id, wait)

  wait.startTimer({ id, awaitMap })

  t.context.clock.tick(5)

  t.true(spy.calledOnceWith(wait))
})
