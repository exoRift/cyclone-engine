import test from 'ava'
import Argument from './'

test('stringAsArgData', (t) => {
  t.deepEqual(new Argument('arg'), new Argument({ name: 'arg' }))
})
