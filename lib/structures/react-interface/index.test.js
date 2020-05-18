import test from 'ava'
import ReactInterface from '.'
import ReactCommand from '../react-command'

test('invalidButtonType', (t) => {
  let error

  try {
    error = new ReactInterface({
      buttons: 1
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied button not ReactCommand instance:\n1'))
})

test('buttonPropertyInheritence', (t) => {
  const reactInterface = new ReactInterface({
    buttons: new ReactCommand({
      emoji: '🍕'
    }),
    options: {
      designatedUsers: ['1', '2'],
      deleteAfterUse: true,
      removeReaction: true,
      authLevel: 2
    }
  })

  t.true(reactInterface.options.deleteAfterUse, 'Delete after use on interface')

  t.deepEqual(reactInterface.buttons.get('🍕').options._designatedUsers, ['1', '2'], 'Designated users')
  t.true(reactInterface.buttons.get('🍕').options.removeReaction, 'Remove reaction')
  t.is(reactInterface.buttons.get('🍕').options.authLevel, 2, 'Auth level')

  const testMorphs = new ReactInterface({
    buttons: new ReactCommand({
      emoji: '🍕'
    }),
    options: {
      designatedUsers: '1'
    }
  })

  t.deepEqual(testMorphs.options.designatedUsers, ['1'], 'Designated users when a string is passed (interface)')
  t.deepEqual(testMorphs.buttons.get('🍕').options._designatedUsers, ['1'], 'Designated users when a string is passed (button)')

  t.is(testMorphs.options.authLevel, 0, 'No auth level provided is 0 (interface)')
  t.is(testMorphs.buttons.get('🍕').options.authLevel, 0, 'No auth level provided is 0 (button)')
})
