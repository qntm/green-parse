/* eslint-env mocha */

import assert from 'node:assert/strict'

import {
  NOTHING,
  EMPTY,
  CHR,
  UNICODE,
  fixed,
  or,
  seq,
  resolve
} from '../src/matcher/index.js'

describe('Matcher', () => {
  describe('class members', () => {
    describe('NOTHING', () => {
      it('works', () => {
        assert.deepEqual([...NOTHING.match('abc', 2)], [])
      })
    })

    describe('EMPTY', () => {
      it('works', () => {
        assert.deepEqual([...EMPTY.match('abc', 2)], [{ j: 2, match: '' }])
      })
    })

    describe('CHR', () => {
      it('works', () => {
        assert.deepEqual([...CHR.match('abc', 2)], [{ j: 3, match: 'c' }])
      })

      it('fails', () => {
        assert.deepEqual([...CHR.match('abc', 3)], [])
      })
    })

    describe('UNICODE', () => {
      it('works', () => {
        assert.deepEqual([...UNICODE.match('abc', 2)], [{ j: 3, match: 'c' }])
      })

      it('fails', () => {
        assert.deepEqual([...UNICODE.match('abc', 3)], [])
      })

      it('handles a surrogate pair', () => {
        assert.deepEqual([...UNICODE.match('\uD800\uDC00', 0)], [{ j: 2, match: '\uD800\uDC00' }])
      })

      it('fails on a mismatched surrogate pair', () => {
        assert.deepEqual([...UNICODE.match('\uD800z', 0)], [])
      })

      it('fails on an early end to the string', () => {
        assert.deepEqual([...UNICODE.match('\uD800', 0)], [])
      })
    })

    describe('fixed', () => {
      it('works', () => {
        const emptyString = fixed('')
        assert.deepEqual([...emptyString.match('aaa', 0)], [{ j: 0, match: '' }])

        const a = fixed('a')
        assert.deepEqual([...a.match('aaa', 0)], [{ j: 1, match: 'a' }])
        assert.deepEqual([...a.match('aaa', 1)], [{ j: 2, match: 'a' }])
        assert.deepEqual([...a.match('aaa', 2)], [{ j: 3, match: 'a' }])
        assert.deepEqual([...a.match('aaa', 3)], [])
        assert.deepEqual([...a.match('baa', 0)], [])
      })

      it('map', () => {
        const matcher = fixed('a').map(match => match + match)
        assert.deepEqual([...matcher.match('a', 0)], [{ j: 1, match: 'aa' }])
      })
    })

    describe('or', () => {
      it('works', () => {
        const aorborc = or(['a', 'b', 'c'])
        assert.deepEqual([...aorborc.match('a', 0)], [{ j: 1, match: 'a' }])
        assert.deepEqual([...aorborc.match('b', 0)], [{ j: 1, match: 'b' }])
        assert.deepEqual([...aorborc.match('z', 0)], [])

        const aora = or(['a', 'a'])
        assert.deepEqual([...aora.match('a', 0)], [
          { j: 1, match: 'a' },
          { j: 1, match: 'a' }
        ])
      })

      it('also works', () => {
        const aorborc = or([or(['a', 'b']), 'c'])
        assert.deepEqual([...aorborc.match('b', 0)], [{ j: 1, match: 'b' }])
      })

      it('also also works', () => {
        const aorborc = or(['a', or(['b', 'c'])])
        assert.deepEqual([...aorborc.match('c', 0)], [{ j: 1, match: 'c' }])
      })

      it('alternate syntax', () => {
        const aorborc = fixed('a').or('b').or('c')
        assert.deepEqual([...aorborc.match('b', 0)], [{ j: 1, match: 'b' }])
      })
    })

    describe('seq', () => {
      it('works for an empty string', () => {
        const emptyString = seq([])
        assert.deepEqual([...emptyString.match('a', 0)], [{ j: 0, match: [] }])
      })

      it('works', () => {
        const a = seq(['a'])
        assert.deepEqual([...a.match('a', 0)], [{ j: 1, match: ['a'] }])
        assert.deepEqual([...a.match('aaaa', 1)], [{ j: 2, match: ['a'] }])

        const aa = seq(['a', 'a'])
        assert.deepEqual([...aa.match('aa', 0)], [{ j: 2, match: ['a', 'a'] }])

        const aaa = seq(['a', 'a', 'a'])
        assert.deepEqual([...aaa.match('aaa', 0)], [{ j: 3, match: ['a', 'a', 'a'] }])
      })

      it('also works', () => {
        const aaa = seq([seq(['a', 'a']), 'a'])
        assert.deepEqual([...aaa.match('aaa', 0)], [{ j: 3, match: [['a', 'a'], 'a'] }])
      })

      it('alternate syntax', () => {
        const aaa = fixed('a').seq('a').seq('a')
        assert.deepEqual([...aaa.match('aaa', 0)], [{ j: 3, match: [['a', 'a'], 'a'] }])
      })

      it('also also works', () => {
        const aaa = seq(['a', seq(['a', 'a'])])
        assert.deepEqual([...aaa.match('aaa', 0)], [{ j: 3, match: ['a', ['a', 'a']] }])
      })

      it('huh? 2', () => {
        const a = seq([fixed('a').star()])
        assert.deepEqual([...a.match('aaaa', 1)], [
          { j: 1, match: [[]] },
          { j: 2, match: [['a']] },
          { j: 3, match: [['a', 'a']] },
          { j: 4, match: [['a', 'a', 'a']] }
        ])
      })

      it('works', () => {
        const matcher = seq(['a', 'b', 'c'], fixed(' ').star())
        assert.deepEqual([...matcher.match('abc', 0)], [{ j: 3, match: ['a', 'b', 'c'] }])
        assert.deepEqual([...matcher.match('a b c', 0)], [{ j: 5, match: ['a', 'b', 'c'] }])
        assert.deepEqual([...matcher.match('a                 b  c', 0)], [{ j: 22, match: ['a', 'b', 'c'] }])
      })
    })

    describe('times', () => {
      it('alternate syntax', () => {
        const aa24 = fixed('a').times(2, 4)
        assert.deepEqual([...aa24.match('aaaaaaa', 1)], [
          { j: 3, match: ['a', 'a'] },
          { j: 4, match: ['a', 'a', 'a'] },
          { j: 5, match: ['a', 'a', 'a', 'a'] }
        ])
      })

      it('works with separator', () => {
        const aa11nosep = fixed('a').times(1, 1)
        assert.deepEqual([...aa11nosep.match('a a a a a a a', 2)], [
          { j: 3, match: ['a'] }
        ])

        const aa11 = fixed('a').times(1, 1, ' ')
        assert.deepEqual([...aa11.match('a a a a a a a', 2)], [
          { j: 3, match: ['a'] }
        ])

        const aa22 = fixed('a').times(2, 2, ' ')
        assert.deepEqual([...aa22.match('a a a a a a a', 2)], [
          { j: 5, match: ['a', 'a'] }
        ])

        const aa12 = fixed('a').times(1, 2, ' ')
        assert.deepEqual([...aa12.match('a a a a a a a', 2)], [
          { j: 3, match: ['a'] },
          { j: 5, match: ['a', 'a'] }
        ])

        const aa24 = fixed('a').times(2, 4, ' ')
        assert.deepEqual([...aa24.match('a a a a a a a', 2)], [
          { j: 5, match: ['a', 'a'] },
          { j: 7, match: ['a', 'a', 'a'] },
          { j: 9, match: ['a', 'a', 'a', 'a'] }
        ])
      })
    })

    describe('star', () => {
      it('alternate syntax', () => {
        const astar = fixed('a').star()
        assert.deepEqual([...astar.match('aaa', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['a'] },
          { j: 2, match: ['a', 'a'] },
          { j: 3, match: ['a', 'a', 'a'] }
        ])
      })

      it('does more complex', () => {
        const aorbstar = or(['a', 'b']).star()
        assert.deepEqual([...aorbstar.match('ab', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['a'] },
          { j: 2, match: ['a', 'b'] }
        ])
      })

      it('alternate syntax', () => {
        const abstar = fixed('a').seq('b').star()
        assert.deepEqual([...abstar.match('ab', 0)], [
          { j: 0, match: [] },
          { j: 2, match: [['a', 'b']] }
        ])
      })

      it('foop', () => {
        const astarb = fixed('a').star().seq('b')
        assert.deepEqual([...astarb.match('aaab', 0)], [{ j: 4, match: [['a', 'a', 'a'], 'b'] }])
      })

      it('what 2', () => {
        const matcher = UNICODE.star()
        assert.deepEqual([...matcher.match('bc', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['b'] },
          { j: 2, match: ['b', 'c'] }
        ])
      })

      it('what 2B', () => {
        const matcher = UNICODE.star(' ')
        assert.deepEqual([...matcher.match('b c de', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['b'] },
          { j: 3, match: ['b', 'c'] },
          { j: 5, match: ['b', 'c', 'd'] }
          // no "e" match
        ])
      })

      it('what 2C', () => {
        const matcher = UNICODE.star(/^ /)
        assert.deepEqual([...matcher.match('b c de', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['b'] },
          { j: 3, match: ['b', 'c'] },
          { j: 5, match: ['b', 'c', 'd'] }
          // no "e" match
        ])
      })

      it('what 3', () => {
        const matcher = UNICODE.star(/^ +/)
        assert.deepEqual([...matcher.match('b   c de', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['b'] },
          { j: 5, match: ['b', 'c'] },
          { j: 7, match: ['b', 'c', 'd'] }
          // no "e" match
        ])
      })
    })

    describe('plus', () => {
      it('alternate syntax', () => {
        const aplus = fixed('a').plus()
        assert.deepEqual([...aplus.match('aaaa', 1)], [
          { j: 2, match: ['a'] },
          { j: 3, match: ['a', 'a'] },
          { j: 4, match: ['a', 'a', 'a'] }
        ])
      })

      it('wplus works', () => {
        const matcher = fixed('a').plus(fixed(' ').star())
        assert.deepEqual([...matcher.match('aaaa', 0)], [
          { j: 1, match: ['a'] },
          { j: 2, match: ['a', 'a'] },
          { j: 3, match: ['a', 'a', 'a'] },
          { j: 4, match: ['a', 'a', 'a', 'a'] }
        ])
        assert.deepEqual([...matcher.match('a     a             a', 0)], [
          { j: 1, match: ['a'] },
          { j: 7, match: ['a', 'a'] },
          { j: 21, match: ['a', 'a', 'a'] }
        ])
      })
    })

    describe('resolve', () => {
      it('works on easy mode', () => {
        const matcher = resolve(ref => ({
          a: fixed('a'),
          b: ref('a')
        })).b

        assert.deepEqual([...matcher.match('a', 0)], [{ j: 1, match: 'a' }])
      })

      it('works', () => {
        const matcher = resolve(ref => ({
          a: 'a',
          b: ref('a')
        })).b

        assert.deepEqual([...matcher.match('a', 0)], [{ j: 1, match: 'a' }])
      })

      it('works too', () => {
        const matcher = resolve(ref => ({
          a: 'a',
          b: ref('a')
        })).b.star()

        assert.deepEqual([...matcher.match('a', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['a'] }
        ])
      })

      it('modifies', () => {
        const matcher = resolve(ref => ({
          a: fixed('a').map(value => 'b'),
          b: ref('a')
        })).b

        assert.deepEqual([...matcher.match('a', 0)], [{ j: 1, match: 'b' }])
      })

      it('modifies too', () => {
        const matcher = resolve(ref => ({
          a: 'a',
          b: ref('a').map(value => 'b')
        })).b

        assert.deepEqual([...matcher.match('a', 0)], [{ j: 1, match: 'b' }])
      })
    })

    describe('filter', () => {
      it('works', () => {
        const matcher = fixed('a').filter(match => match === 'b')
        assert.deepEqual([...matcher.match('a', 0)], [])
      })

      it('what', () => {
        const matcher = UNICODE.filter(match => match !== 'c')
        assert.deepEqual([...matcher.match('bc', 0)], [{ j: 1, match: 'b' }])
      })

      it('how', () => {
        const matcher = UNICODE.filter(match => match !== 'c').star()
        assert.deepEqual([...matcher.match('bc', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['b'] }
        ])
        assert.deepEqual([...matcher.match('abc', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['a'] },
          { j: 2, match: ['a', 'b'] }
        ])
      })
    })

    describe('maybe', () => {
      it('alternate syntax', () => {
        const matcher = fixed('a').maybe()
        assert.deepEqual([...matcher.match('a', 0)], [
          { j: 0, match: [] },
          { j: 1, match: ['a'] }
        ])
      })
    })
  })

  describe('object members', () => {
    describe('parse', () => {
      it('works', () => {
        const matcher = fixed('a').or('aa').star()
        assert.deepEqual([...matcher.parse('aaaa')], [
          ['a', 'a', 'a', 'a'],
          ['a', 'a', 'aa'],
          ['a', 'aa', 'a'],
          ['aa', 'a', 'a'],
          ['aa', 'aa']
        ])
      })
    })

    describe('parse1', () => {
      it('works', () => {
        const matcher = fixed('a').star()
        assert.deepEqual(matcher.parse1('aaa'), ['a', 'a', 'a'])
        assert.deepEqual(matcher.parse1('a'), ['a'])
        assert.deepEqual(matcher.parse1(''), [])
        assert.throws(() => matcher.parse1('aaab'), Error('Parsing failed'))
        assert.throws(() => matcher.parse1('b'), Error('Parsing failed'))
      })
    })
  })
})
