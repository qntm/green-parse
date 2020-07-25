/* eslint-env jest */

const {
  NOTHING,
  EMPTY,
  CHR,
  UNICODE,
  fixed,
  or,
  seq,
  star,
  plus,
  maybe,
  resolve,
  map,
  filter,
  regex,
  parser,
  parse1
} = require('.')

describe('simple match generator functions', () => {
  describe('NOTHING', () => {
    it('works', () => {
      expect([...NOTHING('aaa', 2)]).toEqual([])
    })
  })

  describe('EMPTY', () => {
    it('works', () => {
      expect([...EMPTY('aaa', 2)]).toEqual([{ j: 2, match: '' }])
    })
  })

  describe('CHR', () => {
    it('works', () => {
      expect([...CHR('abc', 2)]).toEqual([{ j: 3, match: 'c' }])
    })

    it('fails', () => {
      expect([...CHR('abc', 3)]).toEqual([])
    })
  })

  describe('UNICODE', () => {
    it('works', () => {
      expect([...UNICODE('abc', 2)]).toEqual([{ j: 3, match: 'c' }])
    })

    it('fails', () => {
      expect([...UNICODE('abc', 3)]).toEqual([])
    })

    it('handles a surrogate pair', () => {
      expect([...UNICODE('\uD800\uDC00', 0)]).toEqual([{ j: 2, match: '\uD800\uDC00' }])
    })

    it('fails on a mismatched surrogate pair', () => {
      expect([...UNICODE('\uD800z', 0)]).toEqual([])
    })

    it('fails on an early end to the string', () => {
      expect([...UNICODE('\uD800', 0)]).toEqual([])
    })
  })

  describe('fixed', () => {
    it('works', () => {
      const emptyString = fixed('')
      expect([...emptyString('aaa', 0)]).toEqual([{ j: 0, match: '' }])

      const a = fixed('a')
      expect([...a('aaa', 0)]).toEqual([{ j: 1, match: 'a' }])
      expect([...a('aaa', 1)]).toEqual([{ j: 2, match: 'a' }])
      expect([...a('aaa', 2)]).toEqual([{ j: 3, match: 'a' }])
      expect([...a('aaa', 3)]).toEqual([])
      expect([...a('baa', 0)]).toEqual([])
    })
  })

  describe('or', () => {
    it('promotes strings to fixed matchers', () => {
      const aorborc = or(['a', 'b', 'c'])
      expect([...aorborc('a', 0)]).toEqual([{ j: 1, match: 'a' }])
      expect([...aorborc('b', 0)]).toEqual([{ j: 1, match: 'b' }])
      expect([...aorborc('z', 0)]).toEqual([])

      const aora = or(['a', 'a'])
      expect([...aora('a', 0)]).toEqual([{ j: 1, match: 'a' }, { j: 1, match: 'a' }])
    })

    it('also works', () => {
      const aorborc = or([or(['a', 'b']), 'c'])
      expect([...aorborc('b', 0)]).toEqual([{ j: 1, match: 'b' }])
    })

    it('also also works', () => {
      const aorborc = or(['a', or(['b', 'c'])])
      expect([...aorborc('c', 0)]).toEqual([{ j: 1, match: 'c' }])
    })
  })

  describe('seq', () => {
    it('works for an empty string', () => {
      const emptyString = seq([])
      expect([...emptyString('a', 0)]).toEqual([{ j: 0, match: [] }])
    })

    it('works', () => {
      const a = seq(['a'])
      expect([...a('a', 0)]).toEqual([{ j: 1, match: ['a'] }])

      const aa = seq(['a', 'a'])
      expect([...aa('aa', 0)]).toEqual([{ j: 2, match: ['a', 'a'] }])

      const aaa = seq(['a', 'a', 'a'])
      expect([...aaa('aaa', 0)]).toEqual([{ j: 3, match: ['a', 'a', 'a'] }])
    })

    it('also works', () => {
      const aaa = seq([seq(['a', 'a']), 'a'])
      expect([...aaa('aaa', 0)]).toEqual([{ j: 3, match: [['a', 'a'], 'a'] }])
    })

    it('also also works', () => {
      const aaa = seq(['a', seq(['a', 'a'])])
      expect([...aaa('aaa', 0)]).toEqual([{ j: 3, match: ['a', ['a', 'a']] }])
    })

    it('wseq works', () => {
      const matcher = seq(
        ['a', 'b', 'c'],
        star(' ')
      )
      expect([...matcher('abc', 0)]).toEqual([{ j: 3, match: ['a', 'b', 'c'] }])
      expect([...matcher('a b c', 0)]).toEqual([{ j: 5, match: ['a', 'b', 'c'] }])
      expect([...matcher('a                 b  c', 0)]).toEqual([{ j: 22, match: ['a', 'b', 'c'] }])
    })

    it('wseq also works', () => {
      const matcher = seq(
        ['a', 'b', 'c'],
        plus(' ')
      )
      expect([...matcher('a b c', 0)]).toEqual([{ j: 5, match: ['a', 'b', 'c'] }])
      expect([...matcher('a                 b  c', 0)]).toEqual([{ j: 22, match: ['a', 'b', 'c'] }])
    })
  })

  describe('star', () => {
    it('promotes a string to a fixed matcher', () => {
      const astar = star('a')
      expect([...astar('aaa', 0)]).toEqual([
        { j: 0, match: [] },
        { j: 1, match: ['a'] },
        { j: 2, match: ['a', 'a'] },
        { j: 3, match: ['a', 'a', 'a'] }
      ])
    })

    it('does more complex', () => {
      const aorbstar = star(or(['a', 'b']))
      expect([...aorbstar('ab', 0)]).toEqual([
        { j: 0, match: [] },
        { j: 1, match: ['a'] },
        { j: 2, match: ['a', 'b'] }
      ])
    })
  })

  describe('plus', () => {
    it('huh? 3', () => {
      const astar = seq(['a'])
      expect([...astar('aaaa', 1)]).toEqual([{ j: 2, match: ['a'] }])
    })

    it('huh? 2', () => {
      const astar = seq([star('a')])
      expect([...astar('aaaa', 1)]).toEqual([
        { j: 1, match: [[]] },
        { j: 2, match: [['a']] },
        { j: 3, match: [['a', 'a']] },
        { j: 4, match: [['a', 'a', 'a']] }
      ])
    })

    it('huh?', () => {
      const a = 'a'
      const aplus = (inner => seq([inner, star(inner)]))(a)
      expect([...aplus('aaaa', 1)]).toEqual([
        { j: 2, match: ['a', []] },
        { j: 3, match: ['a', ['a']] },
        { j: 4, match: ['a', ['a', 'a']] }
      ])
    })

    it('works', () => {
      const aplus = plus('a')
      expect([...aplus('aaaa', 1)]).toEqual([
        { j: 2, match: ['a'] },
        { j: 3, match: ['a', 'a'] },
        { j: 4, match: ['a', 'a', 'a'] }
      ])
    })

    it('promotes a string to a fixed matcher', () => {
      const aplus = plus('a')
      expect([...aplus('aaaa', 1)]).toEqual([
        { j: 2, match: ['a'] },
        { j: 3, match: ['a', 'a'] },
        { j: 4, match: ['a', 'a', 'a'] }
      ])
    })

    it('wplus promotes strings to fixed matchers', () => {
      const matcher = plus('a', star(' '))
      expect([...matcher('aaaa', 0)]).toEqual([
        { j: 1, match: ['a'] },
        { j: 2, match: ['a', 'a'] },
        { j: 3, match: ['a', 'a', 'a'] },
        { j: 4, match: ['a', 'a', 'a', 'a'] }
      ])
      expect([...matcher('a     a             a', 0)]).toEqual([
        { j: 1, match: ['a'] },
        { j: 7, match: ['a', 'a'] },
        { j: 21, match: ['a', 'a', 'a'] }
      ])
    })
  })

  describe('maybe', () => {
    it('promotes a string to a fixed matcher', () => {
      const matcher = maybe('a')
      expect([...matcher('a', 0)]).toEqual([
        { j: 0, match: '' },
        { j: 1, match: 'a' }
      ])
    })
  })

  describe('resolve', () => {
    it('promotes a string to a fixed matcher', () => {
      const matcher = resolve(ref => ({
        a: 'a',
        b: ref('a')
      })).b
      expect([...matcher('a', 0)]).toEqual([{ j: 1, match: 'a' }])
    })

    it('works too', () => {
      const matcher = star(resolve(ref => ({
        a: 'a',
        b: ref('a')
      })).b)
      expect([...matcher('a', 0)]).toEqual([
        { j: 0, match: [] },
        { j: 1, match: ['a'] }
      ])
    })

    it('works three', () => {
      const matcher = resolve(ref => ({
        a: EMPTY,
        b: ref('a')
      })).b
      expect([...matcher('a', 0)]).toEqual([{ j: 0, match: '' }])
    })

    it('modifies', () => {
      const matcher = resolve(ref => ({
        a: map('a', value => 'b'),
        b: ref('a')
      })).b
      expect([...matcher('a', 0)]).toEqual([{ j: 1, match: 'b' }])
    })

    it('modifies too', () => {
      const matcher = resolve(ref => ({
        a: 'a',
        b: map(ref('a'), value => 'b')
      })).b
      expect([...matcher('a', 0)]).toEqual([{ j: 1, match: 'b' }])
    })
  })

  describe('map', () => {
    it('works', () => {
      const matcher = map('a', match => match + match)
      expect([...matcher('a', 0)]).toEqual([{ j: 1, match: 'aa' }])
    })
  })

  describe('filter', () => {
    it('what 2', () => {
      const matcher = star(UNICODE)
      expect([...matcher('bc', 0)]).toEqual([
        { j: 0, match: [] },
        { j: 1, match: ['b'] },
        { j: 2, match: ['b', 'c'] }
      ])
    })

    it('what', () => {
      const matcher = filter(UNICODE, match => match !== 'c')
      expect([...matcher('bc', 0)]).toEqual([{ j: 1, match: 'b' }])
    })

    it('how', () => {
      const matcher = star(filter(UNICODE, match => match !== 'c'))
      expect([...matcher('bc', 0)]).toEqual([
        { j: 0, match: [] },
        { j: 1, match: ['b'] }
      ])
    })

    it('works', () => {
      const matcher = star(filter(UNICODE, match => match !== 'c'))
      expect([...matcher('abc', 0)]).toEqual([
        { j: 0, match: [] },
        { j: 1, match: ['a'] },
        { j: 2, match: ['a', 'b'] }
      ])
    })
  })

  describe('regex', () => {
    it('disallows global regexes', () => {
      expect(() => regex(/^a/g)).toThrowError('Can\'t use a global RegExp')
      expect(() => regex(/a/g)).toThrowError('Can\'t use a global RegExp')
    })

    it('disallows unanchored regexes', () => {
      expect(() => regex(/a/)).toThrowError('RegExp must be anchored at the start of the substring')
    })

    it('works', () => {
      const matcher = regex(/^[0-9a-fA-F]([0-9a-fA-F])/)
      expect([...matcher('0x0134af1', 4)]).toEqual([
        { j: 6, match: ['34', '4'] }
      ])
    })
  })

  describe('parser', () => {
    it('works', () => {
      const p = parser(star(or(['a', 'aa'])))
      expect([...p('aaaa')]).toEqual([
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
      const p = parse1(star(fixed('a')))
      expect(p('aaa')).toEqual(['a', 'a', 'a'])
      expect(p('a')).toEqual(['a'])
      expect(p('')).toEqual([])
      expect(() => p('aaab')).toThrowError('Expected 1 result, got 0')
      expect(() => p('b')).toThrowError('Expected 1 result, got 0')
    })
  })
})
