'use strict'

const {
  NOTHING,
  EMPTY,
  CHR,
  UNICODE,
  fixed,
  or,
  seq,
  times,
  star,
  plus,
  maybe,
  resolve,
  map,
  filter
} = require('../src/matcher.js')

describe('Matcher', () => {
  describe('class members', () => {
    describe('NOTHING', () => {
      it('works', () => {
        expect([...NOTHING('abc', 2)]).toEqual([])
      })
    })

    describe('EMPTY', () => {
      it('works', () => {
        expect([...EMPTY('abc', 2)]).toEqual([{ j: 2, match: '' }])
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

      it('map', () => {
        const matcher = fixed('a').map(match => match + match)
        expect([...matcher('a', 0)]).toEqual([{ j: 1, match: 'aa' }])
      })
    })

    describe('or', () => {
      it('works', () => {
        const aorborc = or(['a', 'b', 'c'])
        expect([...aorborc('a', 0)]).toEqual([{ j: 1, match: 'a' }])
        expect([...aorborc('b', 0)]).toEqual([{ j: 1, match: 'b' }])
        expect([...aorborc('z', 0)]).toEqual([])

        const aora = or(['a', 'a'])
        expect([...aora('a', 0)]).toEqual([
          { j: 1, match: 'a' },
          { j: 1, match: 'a' }
        ])
      })

      it('also works', () => {
        const aorborc = or([or(['a', 'b']), 'c'])
        expect([...aorborc('b', 0)]).toEqual([{ j: 1, match: 'b' }])
      })

      it('also also works', () => {
        const aorborc = or(['a', or(['b', 'c'])])
        expect([...aorborc('c', 0)]).toEqual([{ j: 1, match: 'c' }])
      })

      it('alternate syntax', () => {
        const aorborc = fixed('a').or('b').or('c')
        expect([...aorborc('b', 0)]).toEqual([{ j: 1, match: 'b' }])
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
        expect([...a('aaaa', 1)]).toEqual([{ j: 2, match: ['a'] }])

        const aa = seq(['a', 'a'])
        expect([...aa('aa', 0)]).toEqual([{ j: 2, match: ['a', 'a'] }])

        const aaa = seq(['a', 'a', 'a'])
        expect([...aaa('aaa', 0)]).toEqual([{ j: 3, match: ['a', 'a', 'a'] }])
      })

      it('also works', () => {
        const aaa = seq([seq(['a', 'a']), 'a'])
        expect([...aaa('aaa', 0)]).toEqual([{ j: 3, match: [['a', 'a'], 'a'] }])
      })

      it('alternate syntax', () => {
        const aaa = fixed('a').seq('a').seq('a')
        expect([...aaa('aaa', 0)]).toEqual([{ j: 3, match: [['a', 'a'], 'a'] }])
      })

      it('also also works', () => {
        const aaa = seq(['a', seq(['a', 'a'])])
        expect([...aaa('aaa', 0)]).toEqual([{ j: 3, match: ['a', ['a', 'a']] }])
      })

      it('huh? 2', () => {
        const a = seq([star('a')])
        expect([...a('aaaa', 1)]).toEqual([
          { j: 1, match: [[]] },
          { j: 2, match: [['a']] },
          { j: 3, match: [['a', 'a']] },
          { j: 4, match: [['a', 'a', 'a']] }
        ])
      })

      it('works', () => {
        const matcher = seq(['a', 'b', 'c'], fixed(' ').star())
        expect([...matcher('abc', 0)]).toEqual([{ j: 3, match: ['a', 'b', 'c'] }])
        expect([...matcher('a b c', 0)]).toEqual([{ j: 5, match: ['a', 'b', 'c'] }])
        expect([...matcher('a                 b  c', 0)]).toEqual([{ j: 22, match: ['a', 'b', 'c'] }])
      })
    })

    describe('times', () => {
      it('works', () => {
        const aa24 = times('a', 2, 4)
        expect([...aa24('aaaaaaa', 1)]).toEqual([
          { j: 3, match: ['a', 'a'] },
          { j: 4, match: ['a', 'a', 'a'] },
          { j: 5, match: ['a', 'a', 'a', 'a'] }
        ])
      })

      it('works with separator', () => {
        const aa11nosep = times('a', 1, 1)
        expect([...aa11nosep('a a a a a a a', 2)]).toEqual([
          { j: 3, match: ['a'] }
        ])

        const aa11 = times('a', 1, 1, ' ')
        expect([...aa11('a a a a a a a', 2)]).toEqual([
          { j: 3, match: ['a'] }
        ])

        const aa22 = times('a', 2, 2, ' ')
        expect([...aa22('a a a a a a a', 2)]).toEqual([
          { j: 5, match: ['a', 'a'] }
        ])

        const aa12 = times('a', 1, 2, ' ')
        expect([...aa12('a a a a a a a', 2)]).toEqual([
          { j: 3, match: ['a'] },
          { j: 5, match: ['a', 'a'] }
        ])

        const aa24 = times('a', 2, 4, ' ')
        expect([...aa24('a a a a a a a', 2)]).toEqual([
          { j: 5, match: ['a', 'a'] },
          { j: 7, match: ['a', 'a', 'a'] },
          { j: 9, match: ['a', 'a', 'a', 'a'] }
        ])
      })
    })

    describe('star', () => {
      it('works', () => {
        const astar = star('a')
        expect([...astar('aaa', 0)]).toEqual([
          { j: 0, match: [] },
          { j: 1, match: ['a'] },
          { j: 2, match: ['a', 'a'] },
          { j: 3, match: ['a', 'a', 'a'] }
        ])
      })

      it('alternate syntax', () => {
        const astar = fixed('a').star()
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

      it('alternate syntax', () => {
        const abstar = fixed('a').seq('b').star()
        expect([...abstar('ab', 0)]).toEqual([
          { j: 0, match: [] },
          { j: 2, match: [['a', 'b']] }
        ])
      })

      it('foop', () => {
        const astarb = fixed('a').star().seq('b')
        expect([...astarb('aaab', 0)]).toEqual([{ j: 4, match: [['a', 'a', 'a'], 'b'] }])
      })

      it('what 2', () => {
        const matcher = UNICODE.star()
        expect([...matcher('bc', 0)]).toEqual([
          { j: 0, match: [] },
          { j: 1, match: ['b'] },
          { j: 2, match: ['b', 'c'] }
        ])
      })
    })

    describe('plus', () => {
      it('works', () => {
        const aplus = plus('a')
        expect([...aplus('aaaa', 1)]).toEqual([
          { j: 2, match: ['a'] },
          { j: 3, match: ['a', 'a'] },
          { j: 4, match: ['a', 'a', 'a'] }
        ])
      })

      it('alternate syntax', () => {
        const aplus = fixed('a').plus()
        expect([...aplus('aaaa', 1)]).toEqual([
          { j: 2, match: ['a'] },
          { j: 3, match: ['a', 'a'] },
          { j: 4, match: ['a', 'a', 'a'] }
        ])
      })

      it('wplus works', () => {
        const matcher = plus('a', fixed(' ').star())
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
      it('works', () => {
        const matcher = maybe('a')
        expect([...matcher('a', 0)]).toEqual([
          { j: 0, match: '' },
          { j: 1, match: 'a' }
        ])
      })
    })

    describe('resolve', () => {
      it('works on easy mode', () => {
        const matcher = resolve(ref => ({
          a: fixed('a'),
          b: ref('a')
        })).b

        expect([...matcher('a', 0)]).toEqual([{ j: 1, match: 'a' }])
      })

      it('works', () => {
        const matcher = resolve(ref => ({
          a: 'a',
          b: ref('a')
        })).b

        expect([...matcher('a', 0)]).toEqual([{ j: 1, match: 'a' }])
      })

      it('works too', () => {
        const matcher = resolve(ref => ({
          a: 'a',
          b: ref('a')
        })).b.star()

        expect([...matcher('a', 0)]).toEqual([
          { j: 0, match: [] },
          { j: 1, match: ['a'] }
        ])
      })

      it('modifies', () => {
        const matcher = resolve(ref => ({
          a: fixed('a').map(value => 'b'),
          b: ref('a')
        })).b

        expect([...matcher('a', 0)]).toEqual([{ j: 1, match: 'b' }])
      })

      it('modifies too', () => {
        const matcher = resolve(ref => ({
          a: 'a',
          b: ref('a').map(value => 'b')
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
      it('works', () => {
        const matcher = filter('a', match => match === 'b')
        expect([...matcher('a', 0)]).toEqual([])
      })

      it('what', () => {
        const matcher = UNICODE.filter(match => match !== 'c')
        expect([...matcher('bc', 0)]).toEqual([{ j: 1, match: 'b' }])
      })

      it('how', () => {
        const matcher = UNICODE.filter(match => match !== 'c').star()
        expect([...matcher('bc', 0)]).toEqual([
          { j: 0, match: [] },
          { j: 1, match: ['b'] }
        ])
        expect([...matcher('abc', 0)]).toEqual([
          { j: 0, match: [] },
          { j: 1, match: ['a'] },
          { j: 2, match: ['a', 'b'] }
        ])
      })
    })

    describe('maybe', () => {
      it('works', () => {
        const matcher = maybe('a')
        expect([...matcher('a', 0)]).toEqual([
          { j: 0, match: '' },
          { j: 1, match: 'a' }
        ])
      })

      it('alternate syntax', () => {
        const matcher = fixed('a').maybe()
        expect([...matcher('a', 0)]).toEqual([
          { j: 0, match: '' },
          { j: 1, match: 'a' }
        ])
      })
    })
  })

  describe('object members', () => {
  })
})
