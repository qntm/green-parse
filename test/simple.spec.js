/* eslint-env mocha */

import assert from 'assert'

import {
  NOTHING,
  EMPTY,
  CHR,
  UNICODE,
  fixed,
  or,
  seq,
  times,
  resolve,
  map,
  filter,
  regex
} from '../src/simple/index.js'

describe('simple match generator functions', () => {
  describe('NOTHING', () => {
    it('works', () => {
      assert.deepStrictEqual([...NOTHING('aaa', 2)], [])
    })
  })

  describe('EMPTY', () => {
    it('works', () => {
      assert.deepStrictEqual([...EMPTY('aaa', 2)], [{ j: 2, match: '' }])
    })
  })

  describe('CHR', () => {
    it('works', () => {
      assert.deepStrictEqual([...CHR('abc', 2)], [{ j: 3, match: 'c' }])
    })

    it('fails', () => {
      assert.deepStrictEqual([...CHR('abc', 3)], [])
    })
  })

  describe('UNICODE', () => {
    it('works', () => {
      assert.deepStrictEqual([...UNICODE('abc', 2)], [{ j: 3, match: 'c' }])
    })

    it('fails', () => {
      assert.deepStrictEqual([...UNICODE('abc', 3)], [])
    })

    it('handles a surrogate pair', () => {
      assert.deepStrictEqual([...UNICODE('\uD800\uDC00', 0)], [{ j: 2, match: '\uD800\uDC00' }])
    })

    it('fails on a mismatched surrogate pair', () => {
      assert.deepStrictEqual([...UNICODE('\uD800z', 0)], [])
    })

    it('fails on an early end to the string', () => {
      assert.deepStrictEqual([...UNICODE('\uD800', 0)], [])
    })
  })

  describe('fixed', () => {
    it('works', () => {
      const emptyString = fixed('')
      assert.deepStrictEqual([...emptyString('aaa', 0)], [{ j: 0, match: '' }])

      const a = fixed('a')
      assert.deepStrictEqual([...a('aaa', 0)], [{ j: 1, match: 'a' }])
      assert.deepStrictEqual([...a('aaa', 1)], [{ j: 2, match: 'a' }])
      assert.deepStrictEqual([...a('aaa', 2)], [{ j: 3, match: 'a' }])
      assert.deepStrictEqual([...a('aaa', 3)], [])
      assert.deepStrictEqual([...a('baa', 0)], [])
    })
  })

  describe('or', () => {
    it('promotes strings to fixed matchers', () => {
      const aorborc = or([fixed('a'), fixed('b'), fixed('c')])
      assert.deepStrictEqual([...aorborc('a', 0)], [{ j: 1, match: 'a' }])
      assert.deepStrictEqual([...aorborc('b', 0)], [{ j: 1, match: 'b' }])
      assert.deepStrictEqual([...aorborc('z', 0)], [])

      const aora = or([fixed('a'), fixed('a')])
      assert.deepStrictEqual([...aora('a', 0)], [{ j: 1, match: 'a' }, { j: 1, match: 'a' }])
    })

    it('also works', () => {
      const aorborc = or([or([fixed('a'), fixed('b')]), fixed('c')])
      assert.deepStrictEqual([...aorborc('b', 0)], [{ j: 1, match: 'b' }])
    })

    it('also also works', () => {
      const aorborc = or([fixed('a'), or([fixed('b'), fixed('c')])])
      assert.deepStrictEqual([...aorborc('c', 0)], [{ j: 1, match: 'c' }])
    })
  })

  describe('seq', () => {
    it('works for an empty string', () => {
      const emptyString = seq([], EMPTY)
      assert.deepStrictEqual([...emptyString('a', 0)], [{ j: 0, match: [] }])
    })

    it('works', () => {
      const a = seq([fixed('a')], EMPTY)
      assert.deepStrictEqual([...a('a', 0)], [{ j: 1, match: ['a'] }])

      const aa = seq([fixed('a'), fixed('a')], EMPTY)
      assert.deepStrictEqual([...aa('aa', 0)], [{ j: 2, match: ['a', 'a'] }])

      const aaa = seq([fixed('a'), fixed('a'), fixed('a')], EMPTY)
      assert.deepStrictEqual([...aaa('aaa', 0)], [{ j: 3, match: ['a', 'a', 'a'] }])
    })

    it('also works', () => {
      const aaa = seq([seq([fixed('a'), fixed('a')], EMPTY), fixed('a')], EMPTY)
      assert.deepStrictEqual([...aaa('aaa', 0)], [{ j: 3, match: [['a', 'a'], 'a'] }])
    })

    it('also also works', () => {
      const aaa = seq([fixed('a'), seq([fixed('a'), fixed('a')], EMPTY)], EMPTY)
      assert.deepStrictEqual([...aaa('aaa', 0)], [{ j: 3, match: ['a', ['a', 'a']] }])
    })

    it('wseq works', () => {
      const matcher = seq(
        [fixed('a'), fixed('b'), fixed('c')],
        times(fixed(' '), 0, Infinity, EMPTY)
      )
      assert.deepStrictEqual([...matcher('abc', 0)], [{ j: 3, match: ['a', 'b', 'c'] }])
      assert.deepStrictEqual([...matcher('a b c', 0)], [{ j: 5, match: ['a', 'b', 'c'] }])
      assert.deepStrictEqual([...matcher('a                 b  c', 0)], [{ j: 22, match: ['a', 'b', 'c'] }])
    })

    it('wseq promotes the separator', () => {
      const matcher = seq(
        [fixed('a'), fixed('b'), fixed('c')],
        fixed(' ')
      )
      assert.deepStrictEqual([...matcher('a b c', 0)], [{ j: 5, match: ['a', 'b', 'c'] }])
    })

    it('wseq also works', () => {
      const matcher = seq(
        [fixed('a'), fixed('b'), fixed('c')],
        times(fixed(' '), 1, Infinity, EMPTY)
      )
      assert.deepStrictEqual([...matcher('a b c', 0)], [{ j: 5, match: ['a', 'b', 'c'] }])
      assert.deepStrictEqual([...matcher('a                 b  c', 0)], [{ j: 22, match: ['a', 'b', 'c'] }])
    })
  })

  describe('star', () => {
    it('promotes a string to a fixed matcher', () => {
      const astar = times(fixed('a'), 0, Infinity, EMPTY)
      assert.deepStrictEqual([...astar('aaa', 0)], [
        { j: 0, match: [] },
        { j: 1, match: ['a'] },
        { j: 2, match: ['a', 'a'] },
        { j: 3, match: ['a', 'a', 'a'] }
      ])
    })

    it('does more complex', () => {
      const aorbstar = times(or([fixed('a'), fixed('b')]), 0, Infinity, EMPTY)
      assert.deepStrictEqual([...aorbstar('ab', 0)], [
        { j: 0, match: [] },
        { j: 1, match: ['a'] },
        { j: 2, match: ['a', 'b'] }
      ])
    })
  })

  describe('plus', () => {
    it('huh? 3', () => {
      const astar = seq([fixed('a')])
      assert.deepStrictEqual([...astar('aaaa', 1)], [{ j: 2, match: ['a'] }])
    })

    it('huh? 2', () => {
      const astar = seq([times(fixed('a'), 0, Infinity, EMPTY)])
      assert.deepStrictEqual([...astar('aaaa', 1)], [
        { j: 1, match: [[]] },
        { j: 2, match: [['a']] },
        { j: 3, match: [['a', 'a']] },
        { j: 4, match: [['a', 'a', 'a']] }
      ])
    })

    it('huh?', () => {
      const a = fixed('a')
      const aplus = (inner => seq([inner, times(inner, 0, Infinity, EMPTY)], EMPTY))(a)
      assert.deepStrictEqual([...aplus('aaaa', 1)], [
        { j: 2, match: ['a', []] },
        { j: 3, match: ['a', ['a']] },
        { j: 4, match: ['a', ['a', 'a']] }
      ])
    })

    it('works', () => {
      const aplus = times(fixed('a'), 1, Infinity, EMPTY)
      assert.deepStrictEqual([...aplus('aaaa', 1)], [
        { j: 2, match: ['a'] },
        { j: 3, match: ['a', 'a'] },
        { j: 4, match: ['a', 'a', 'a'] }
      ])
    })

    it('promotes a string to a fixed matcher', () => {
      const aplus = times(fixed('a'), 1, Infinity, EMPTY)
      assert.deepStrictEqual([...aplus('aaaa', 1)], [
        { j: 2, match: ['a'] },
        { j: 3, match: ['a', 'a'] },
        { j: 4, match: ['a', 'a', 'a'] }
      ])
    })

    it('wplus promotes strings to fixed matchers', () => {
      const matcher = times(fixed('a'), 1, Infinity, times(fixed(' '), 0, Infinity, EMPTY))
      assert.deepStrictEqual([...matcher('aaaa', 0)], [
        { j: 1, match: ['a'] },
        { j: 2, match: ['a', 'a'] },
        { j: 3, match: ['a', 'a', 'a'] },
        { j: 4, match: ['a', 'a', 'a', 'a'] }
      ])
      assert.deepStrictEqual([...matcher('a     a             a', 0)], [
        { j: 1, match: ['a'] },
        { j: 7, match: ['a', 'a'] },
        { j: 21, match: ['a', 'a', 'a'] }
      ])
    })
  })

  describe('maybe', () => {
    it('promotes a string to a fixed matcher', () => {
      const matcher = times(fixed('a'), 0, 1, EMPTY)
      assert.deepStrictEqual([...matcher('a', 0)], [
        { j: 0, match: [] },
        { j: 1, match: ['a'] }
      ])
    })
  })

  describe('resolve', () => {
    it('promotes a string to a fixed matcher', () => {
      const matcher = resolve(ref => ({
        a: fixed('a'),
        b: ref('a')
      })).b
      assert.deepStrictEqual([...matcher('a', 0)], [{ j: 1, match: 'a' }])
    })

    it('works too', () => {
      const matcher = times(resolve(ref => ({
        a: fixed('a'),
        b: ref('a')
      })).b, 0, Infinity, EMPTY)
      assert.deepStrictEqual([...matcher('a', 0)], [
        { j: 0, match: [] },
        { j: 1, match: ['a'] }
      ])
    })

    it('works three', () => {
      const matcher = resolve(ref => ({
        a: EMPTY,
        b: ref('a')
      })).b
      assert.deepStrictEqual([...matcher('a', 0)], [{ j: 0, match: '' }])
    })

    it('modifies', () => {
      const matcher = resolve(ref => ({
        a: map(fixed('a'), value => 'b'),
        b: ref('a')
      })).b
      assert.deepStrictEqual([...matcher('a', 0)], [{ j: 1, match: 'b' }])
    })

    it('modifies too', () => {
      const matcher = resolve(ref => ({
        a: fixed('a'),
        b: map(ref('a'), value => 'b')
      })).b
      assert.deepStrictEqual([...matcher('a', 0)], [{ j: 1, match: 'b' }])
    })
  })

  describe('times', () => {
    it('works with max 0', () => {
      const matcher = times(fixed('a'), 0, 0, EMPTY)
      assert.deepStrictEqual([...matcher('aaaaa', 1)], [{ j: 1, match: [] }])
    })

    it('works with max 0 and a separator', () => {
      const matcher = times(fixed('a'), 0, 0, fixed(' '))
      assert.deepStrictEqual([...matcher('a a a a a', 2)], [{ j: 2, match: [] }])
    })
  })

  describe('map', () => {
    it('works', () => {
      const matcher = map(fixed('a'), match => match + match)
      assert.deepStrictEqual([...matcher('a', 0)], [{ j: 1, match: 'aa' }])
    })
  })

  describe('filter', () => {
    it('what 2', () => {
      const matcher = times(UNICODE, 0, Infinity, EMPTY)
      assert.deepStrictEqual([...matcher('bc', 0)], [
        { j: 0, match: [] },
        { j: 1, match: ['b'] },
        { j: 2, match: ['b', 'c'] }
      ])
    })

    it('what', () => {
      const matcher = filter(UNICODE, match => match !== 'c')
      assert.deepStrictEqual([...matcher('bc', 0)], [{ j: 1, match: 'b' }])
    })

    it('how', () => {
      const matcher = times(filter(UNICODE, match => match !== 'c'), 0, Infinity, EMPTY)
      assert.deepStrictEqual([...matcher('bc', 0)], [
        { j: 0, match: [] },
        { j: 1, match: ['b'] }
      ])
    })

    it('works', () => {
      const matcher = times(filter(UNICODE, match => match !== 'c'), 0, Infinity, EMPTY)
      assert.deepStrictEqual([...matcher('abc', 0)], [
        { j: 0, match: [] },
        { j: 1, match: ['a'] },
        { j: 2, match: ['a', 'b'] }
      ])
    })
  })

  describe('regex', () => {
    it('disallows global regexes', () => {
      assert.throws(() => regex(/^a/g), Error('Can\'t use a global RegExp'))
      assert.throws(() => regex(/a/g), Error('Can\'t use a global RegExp'))
    })

    it('disallows unanchored regexes', () => {
      assert.throws(() => regex(/a/), Error('RegExp must be anchored at the start of the substring'))
    })

    it('works', () => {
      const matcher = regex(/^[0-9a-fA-F]([0-9a-fA-F])/)
      assert.deepStrictEqual([...matcher('0x0134af1', 4)], [
        { j: 6, match: ['34', '4'] }
      ])
    })
  })
})
