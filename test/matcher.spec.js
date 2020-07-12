'use strict'

const {
  Matcher,
  Parser,
  chr,
  fixed,
  or,
  plus,
  resolve,
  seq,
  star,
  unicode,
  wseq,
  wplus,
  maybe,
  MonoParser
} = require('../src/main.js')

xdescribe('Matcher', () => {
  describe('constructor', () => {
    it('useless', () => {
      const useless = (string, i) => ({ next: () => ({ done: true }) })
      const matcher = Matcher(useless)
      expect([...matcher('abc', 1)]).toEqual([])
    })

    it('single result', () => {
      const one = (string, i) => {
        let done = false
        return {
          next: () => {
            if (done) {
              return {
                done: true
              }
            } else {
              const result = {
                value: {
                  match: 345,
                  j: 2
                },
                done: false
              }
              done = true
              return result
            }
          }
        }
      }
      const matcher = Matcher(one)
      expect([...matcher('abc', 1)]).toEqual([{
        match: 345,
        j: 2
      }])
    })

    // TODO: test generator function behaviour
  })

  describe('fixed', () => {
    it('works', () => {
      const emptyString = fixed('')
      expect([...emptyString('aaa', 0)]).toEqual([{
        j: 0,
        match: ''
      }])

      const a = fixed('a')
      expect([...a('aaa', 0)]).toEqual([{
        j: 1,
        match: 'a'
      }])

      expect([...a('aaa', 1)]).toEqual([{
        j: 2,
        match: 'a'
      }])

      expect([...a('aaa', 2)]).toEqual([{
        j: 3,
        match: 'a'
      }])

      expect([...a('aaa', 3)]).toEqual([])

      expect([...a('baa', 0)]).toEqual([])
    })

    it('map', () => {
      const matcher = fixed('a').map(match => match + match)
      expect([...matcher('a', 0)]).toEqual([{
        j: 1,
        match: 'aa'
      }])
    })
  })

  describe('or', () => {
    it('works', () => {
      const aorborc = or([fixed('a'), fixed('b'), fixed('c')])
      expect([...aorborc('a', 0)]).toEqual([{
        j: 1,
        match: 'a'
      }])

      expect([...aorborc('b', 0)]).toEqual([{
        j: 1,
        match: 'b'
      }])

      expect([...aorborc('z', 0)]).toEqual([])

      const aora = or([fixed('a'), fixed('a')])
      expect([...aora('a', 0)]).toEqual([{
        j: 1,
        match: 'a'
      }, {
        j: 1,
        match: 'a'
      }])
    })

    it('promotes strings to fixed matchers', () => {
      const aorborc = or(['a', 'b', 'c'])
      expect([...aorborc('a', 0)]).toEqual([{
        j: 1,
        match: 'a'
      }])

      expect([...aorborc('b', 0)]).toEqual([{
        j: 1,
        match: 'b'
      }])

      expect([...aorborc('z', 0)]).toEqual([])

      const aora = or([fixed('a'), fixed('a')])
      expect([...aora('a', 0)]).toEqual([{
        j: 1,
        match: 'a'
      }, {
        j: 1,
        match: 'a'
      }])
    })

    it('also works', () => {
      const aorborc = or([or([fixed('a'), fixed('b')]), fixed('c')])
      expect([...aorborc('b', 0)]).toEqual([{
        j: 1,
        match: 'b'
      }])
    })

    it('also also works', () => {
      const aorborc = or([fixed('a'), or([fixed('b'), fixed('c')])])
      expect([...aorborc('c', 0)]).toEqual([{
        j: 1,
        match: 'c'
      }])
    })

    it('alternate syntax', () => {
      const aorborc = fixed('a').or(fixed('b')).or(fixed('c'))
      expect([...aorborc('b', 0)]).toEqual([{
        j: 1,
        match: 'b'
      }])
    })
  })

  describe('seq', () => {
    it('works for an empty string', () => {
      const emptyString = seq([])
      expect([...emptyString('a', 0)]).toEqual([{
        j: 0,
        match: []
      }])
    })

    it('works', () => {
      const a = seq([fixed('a')])
      expect([...a('a', 0)]).toEqual([{
        j: 1,
        match: ['a']
      }])

      const aa = seq([fixed('a'), fixed('a')])
      expect([...aa('aa', 0)]).toEqual([{
        j: 2,
        match: ['a', 'a']
      }])

      const aaa = seq([fixed('a'), fixed('a'), fixed('a')])
      expect([...aaa('aaa', 0)]).toEqual([{
        j: 3,
        match: ['a', 'a', 'a']
      }])
    })

    it('also works', () => {
      const aaa = seq([seq([fixed('a'), fixed('a')]), fixed('a')])
      expect([...aaa('aaa', 0)]).toEqual([{
        j: 3,
        match: [['a', 'a'], 'a']
      }])
    })

    it('promotes strings to fixed matchers', () => {
      const aaa = seq([seq(['a', 'a']), 'a'])
      expect([...aaa('aaa', 0)]).toEqual([{
        j: 3,
        match: [['a', 'a'], 'a']
      }])
    })

    it('alternate syntax', () => {
      const aaa = fixed('a').seq(fixed('a')).seq(fixed('a'))
      expect([...aaa('aaa', 0)]).toEqual([{
        j: 3,
        match: [['a', 'a'], 'a']
      }])
    })

    it('also also works', () => {
      const aaa = seq([fixed('a'), seq([fixed('a'), fixed('a')])])
      expect([...aaa('aaa', 0)]).toEqual([{
        j: 3,
        match: ['a', ['a', 'a']]
      }])
    })
  })

  describe('star', () => {
    it('works', () => {
      const astar = star(fixed('a'))
      expect([...astar('aaa', 0)]).toEqual([{
        j: 0,
        match: []
      }, {
        j: 1,
        match: ['a']
      }, {
        j: 2,
        match: ['a', 'a']
      }, {
        j: 3,
        match: ['a', 'a', 'a']
      }])
    })

    it('promotes a string to a fixed matcher', () => {
      const astar = star('a')
      expect([...astar('aaa', 0)]).toEqual([{
        j: 0,
        match: []
      }, {
        j: 1,
        match: ['a']
      }, {
        j: 2,
        match: ['a', 'a']
      }, {
        j: 3,
        match: ['a', 'a', 'a']
      }])
    })

    it('alternate syntax', () => {
      const astar = fixed('a').star()
      expect([...astar('aaa', 0)]).toEqual([{
        j: 0,
        match: []
      }, {
        j: 1,
        match: ['a']
      }, {
        j: 2,
        match: ['a', 'a']
      }, {
        j: 3,
        match: ['a', 'a', 'a']
      }])
    })

    it('does more complex', () => {
      const aorbstar = star(or([fixed('a'), fixed('b')]))
      expect([...aorbstar('ab', 0)]).toEqual([{
        j: 0,
        match: []
      }, {
        j: 1,
        match: ['a']
      }, {
        j: 2,
        match: ['a', 'b']
      }])
    })

    it('alternate syntax', () => {
      const abstar = fixed('a').seq(fixed('b')).star()
      expect([...abstar('ab', 0)]).toEqual([{
        j: 0,
        match: []
      }, {
        j: 2,
        match: [['a', 'b']]
      }])
    })

    it('foop', () => {
      const astarb = fixed('a').star().seq(fixed('b'))
      expect([...astarb('aaab', 0)]).toEqual([{
        j: 4,
        match: [['a', 'a', 'a'], 'b']
      }])
    })
  })

  describe('plus', () => {
    it('huh? 3', () => {
      const astar = seq([fixed('a')])
      expect([...astar('aaaa', 1)]).toEqual([{
        j: 2,
        match: ['a']
      }])
    })

    it('huh? 2', () => {
      const astar = seq([star(fixed('a'))])
      expect([...astar('aaaa', 1)]).toEqual([{
        j: 1,
        match: [[]]
      }, {
        j: 2,
        match: [['a']]
      }, {
        j: 3,
        match: [['a', 'a']]
      }, {
        j: 4,
        match: [['a', 'a', 'a']]
      }])
    })

    it('huh?', () => {
      const a = fixed('a')
      const aplus = (inner => seq([inner, star(inner)]))(a)
      expect([...aplus('aaaa', 1)]).toEqual([{
        j: 2,
        match: ['a', []]
      }, {
        j: 3,
        match: ['a', ['a']]
      }, {
        j: 4,
        match: ['a', ['a', 'a']]
      }])
    })

    it('works', () => {
      const aplus = plus(fixed('a'))
      expect([...aplus('aaaa', 1)]).toEqual([{
        j: 2,
        match: ['a']
      }, {
        j: 3,
        match: ['a', 'a']
      }, {
        j: 4,
        match: ['a', 'a', 'a']
      }])
    })

    it('promotes a string to a fixed matcher', () => {
      const aplus = plus('a')
      expect([...aplus('aaaa', 1)]).toEqual([{
        j: 2,
        match: ['a']
      }, {
        j: 3,
        match: ['a', 'a']
      }, {
        j: 4,
        match: ['a', 'a', 'a']
      }])
    })

    it('alternate syntax', () => {
      const aplus = fixed('a').plus()
      expect([...aplus('aaaa', 1)]).toEqual([{
        j: 2,
        match: ['a']
      }, {
        j: 3,
        match: ['a', 'a']
      }, {
        j: 4,
        match: ['a', 'a', 'a']
      }])
    })
  })

  describe('resolve', () => {
    it('works', () => {
      const unresolved = ref => ({
        a: fixed('a'),
        b: ref('a')
      })

      const resolved = resolve(unresolved)

      expect([...resolved.b('a', 0)]).toEqual([{
        j: 1,
        match: 'a'
      }])
    })

    it('promotes a string to a fixed matcher', () => {
      const unresolved = ref => ({
        a: 'a',
        b: ref('a')
      })

      const resolved = resolve(unresolved)

      expect([...resolved.b('a', 0)]).toEqual([{
        j: 1,
        match: 'a'
      }])
    })

    it('works too', () => {
      const unresolved = ref => ({
        a: fixed('a'),
        b: ref('a')
      })

      const resolved = resolve(unresolved).b.star()

      expect([...resolved('a', 0)]).toEqual([{
        j: 0,
        match: []
      }, {
        j: 1,
        match: ['a']
      }])
    })

    it('works on non-matcher generator thingies', () => {
      const unresolved = ref => ({
        a: fixed('a'),
        b: ref('a')
      })

      const resolved = resolve(unresolved)

      expect([...resolved.b('a', 0)]).toEqual([{
        j: 1,
        match: 'a'
      }])
    })

    it('works too', () => {
      const unresolved = ref => ({
        a: (string, i) => ({ next: () => ({ done: true }) }),
        b: ref('a')
      })

      const resolvedB = resolve(unresolved).b

      expect([...resolvedB('a', 0)]).toEqual([])
    })

    it('modifies', () => {
      const unresolved = ref => ({
        a: fixed('a').map(value => 'b'),
        b: ref('a')
      })

      const resolved = resolve(unresolved)

      expect([...resolved.b('a', 0)]).toEqual([{
        j: 1,
        match: 'b'
      }])
    })

    it('modifies too', () => {
      const unresolved = ref => ({
        a: fixed('a'),
        b: ref('a').map(value => 'b')
      })

      const resolved = resolve(unresolved)

      expect([...resolved.b('a', 0)]).toEqual([{
        j: 1,
        match: 'b'
      }])
    })
  })

  describe('chr', () => {
    it('works', () => {
      const iterator = chr('abc', 2)
      expect(iterator.next()).toEqual({ value: { j: 3, match: 'c' }, done: false })
      expect(iterator.next()).toEqual({ done: true })
    })

    it('fails', () => {
      const iterator = chr('abc', 3)
      expect(iterator.next()).toEqual({ done: true })
    })
  })

  describe('unicode', () => {
    it('works', () => {
      const iterator = unicode('abc', 2)
      expect(iterator.next()).toEqual({ value: { j: 3, match: 'c' }, done: false })
      expect(iterator.next()).toEqual({ done: true })
    })

    it('fails', () => {
      const iterator = unicode('abc', 3)
      expect(iterator.next()).toEqual({ done: true })
    })

    it('handles a surrogate pair', () => {
      const iterator = unicode('\uD800\uDC00', 0)
      expect(iterator.next()).toEqual({ value: { j: 2, match: '\uD800\uDC00' }, done: false })
      expect(iterator.next()).toEqual({ done: true })
    })

    it('fails on a mismatched surrogate pair', () => {
      const iterator = unicode('\uD800z', 0)
      expect(iterator.next()).toEqual({ done: true })
    })

    it('fails on an early end to the string', () => {
      const iterator = unicode('\uD800', 0)
      expect(iterator.next()).toEqual({ done: true })
    })
  })

  describe('filter', () => {
    it('what 2', () => {
      const matcher = unicode.star()

      const iterator = matcher('bc', 0)
      expect(iterator.next()).toEqual({ value: { j: 0, match: [] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 1, match: ['b'] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 2, match: ['b', 'c'] }, done: false })
      expect(iterator.next()).toEqual({ done: true })
    })

    it('what', () => {
      const matcher = unicode.filter(match => match !== 'c')

      const iterator = matcher('bc', 0)
      expect(iterator.next()).toEqual({ value: { j: 1, match: 'b' }, done: false })
      expect(iterator.next()).toEqual({ done: true })
    })

    it('how', () => {
      const matcher = unicode.filter(match => match !== 'c').star()

      const iterator = matcher('bc', 0)
      expect(iterator.next()).toEqual({ value: { j: 0, match: [] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 1, match: ['b'] }, done: false })
      expect(iterator.next()).toEqual({ done: true })
    })

    it('works', () => {
      const matcher = unicode.filter(match => match !== 'c').star()

      const iterator = matcher('abc', 0)
      expect(iterator.next()).toEqual({ value: { j: 0, match: [] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 1, match: ['a'] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 2, match: ['a', 'b'] }, done: false })
      expect(iterator.next()).toEqual({ done: true })
    })
  })

  describe('wseq', () => {
    it('works', () => {
      const matcher = wseq(
        [fixed('a'), fixed('b'), fixed('c')],
        fixed(' ').star()
      )

      const iterator = matcher('abc', 0)
      expect(iterator.next()).toEqual({ value: { j: 3, match: ['a', 'b', 'c'] }, done: false })
      expect(iterator.next()).toEqual({ done: true })

      const iterator2 = matcher('a b c', 0)
      expect(iterator2.next()).toEqual({ value: { j: 5, match: ['a', 'b', 'c'] }, done: false })
      expect(iterator2.next()).toEqual({ done: true })

      const iterator3 = matcher('a                 b  c', 0)
      expect(iterator3.next()).toEqual({ value: { j: 22, match: ['a', 'b', 'c'] }, done: false })
      expect(iterator3.next()).toEqual({ done: true })
    })

    it('promotes strings to a fixed matchers', () => {
      const matcher = wseq(
        ['a', 'b', 'c'],
        star(' ')
      )

      const iterator = matcher('abc', 0)
      expect(iterator.next()).toEqual({ value: { j: 3, match: ['a', 'b', 'c'] }, done: false })
      expect(iterator.next()).toEqual({ done: true })

      const iterator2 = matcher('a b c', 0)
      expect(iterator2.next()).toEqual({ value: { j: 5, match: ['a', 'b', 'c'] }, done: false })
      expect(iterator2.next()).toEqual({ done: true })

      const iterator3 = matcher('a                 b  c', 0)
      expect(iterator3.next()).toEqual({ value: { j: 22, match: ['a', 'b', 'c'] }, done: false })
      expect(iterator3.next()).toEqual({ done: true })
    })
  })

  describe('wplus', () => {
    it('works', () => {
      const matcher = wplus(fixed('a'), fixed(' ').star())

      const iterator = matcher('aaaa', 0)
      expect(iterator.next()).toEqual({ value: { j: 1, match: ['a'] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 2, match: ['a', 'a'] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 3, match: ['a', 'a', 'a'] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 4, match: ['a', 'a', 'a', 'a'] }, done: false })
      expect(iterator.next()).toEqual({ done: true })

      const iterator2 = matcher('a     a             a', 0)
      expect(iterator2.next()).toEqual({ value: { j: 1, match: ['a'] }, done: false })
      expect(iterator2.next()).toEqual({ value: { j: 7, match: ['a', 'a'] }, done: false })
      expect(iterator2.next()).toEqual({ value: { j: 21, match: ['a', 'a', 'a'] }, done: false })
      expect(iterator2.next()).toEqual({ done: true })
    })

    it('promotes strings to fixed matchers', () => {
      const matcher = wplus('a', star(' '))

      const iterator = matcher('aaaa', 0)
      expect(iterator.next()).toEqual({ value: { j: 1, match: ['a'] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 2, match: ['a', 'a'] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 3, match: ['a', 'a', 'a'] }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 4, match: ['a', 'a', 'a', 'a'] }, done: false })
      expect(iterator.next()).toEqual({ done: true })

      const iterator2 = matcher('a     a             a', 0)
      expect(iterator2.next()).toEqual({ value: { j: 1, match: ['a'] }, done: false })
      expect(iterator2.next()).toEqual({ value: { j: 7, match: ['a', 'a'] }, done: false })
      expect(iterator2.next()).toEqual({ value: { j: 21, match: ['a', 'a', 'a'] }, done: false })
      expect(iterator2.next()).toEqual({ done: true })
    })
  })

  describe('maybe', () => {
    it('works', () => {
      const matcher = fixed('a').maybe()
      const iterator = matcher('a', 0)
      expect(iterator.next()).toEqual({ value: { j: 1, match: 'a' }, done: false })
      expect(iterator.next()).toEqual({ value: { j: 0, match: '' }, done: false })
      expect(iterator.next()).toEqual({ done: true })
    })
  })
})

describe('maybe', () => {
  it('works', () => {
    const matcher = maybe(fixed('a'))
    const iterator = matcher('a', 0)
    expect(iterator.next()).toEqual({ value: { j: 1, match: 'a' }, done: false })
    expect(iterator.next()).toEqual({ value: { j: 0, match: '' }, done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
  })

  it('promotes a string to a fixed matcher', () => {
    const matcher = maybe('a')
    const iterator = matcher('a', 0)
    expect(iterator.next()).toEqual({ value: { j: 1, match: 'a' }, done: false })
    expect(iterator.next()).toEqual({ value: { j: 0, match: '' }, done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
  })
})

describe('Parser', () => {
  it('works', () => {
    const astar = Parser(fixed('a').star())
    const iterator = astar('aaa')
    expect(iterator.next()).toEqual({ value: ['a', 'a', 'a'], done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
  })

  it('promotes a string to a fixed matcher', () => {
    const astar = Parser(star('a'))
    const iterator = astar('aaa')
    expect(iterator.next()).toEqual({ value: ['a', 'a', 'a'], done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
  })
})

describe('MonoParser', () => {
  it('works', () => {
    const astar = MonoParser(fixed('a').star())
    expect(astar('aaa')).toEqual(['a', 'a', 'a'])
    expect(astar('a')).toEqual(['a'])
    expect(astar('')).toEqual([])
    expect(() => astar('aaab')).toThrowError('Expected 1 result, got 0')
    expect(() => astar('b')).toThrowError('Expected 1 result, got 0')
  })

  it('promotes a string to a fixed matcher', () => {
    const astar = MonoParser(star('a'))
    expect(astar('aaa')).toEqual(['a', 'a', 'a'])
    expect(astar('a')).toEqual(['a'])
    expect(astar('')).toEqual([])
    expect(() => astar('aaab')).toThrowError('Expected 1 result, got 0')
    expect(() => astar('b')).toThrowError('Expected 1 result, got 0')
  })

  it('dislikes ambiguity', () => {
    const ambiguous1 = Parser(or([
      seq([fixed('a'), fixed('aa')]),
      seq([fixed('aa'), fixed('a')])
    ]))
    const iterator = ambiguous1('aaa')
    expect(iterator.next()).toEqual({ value: ['a', 'aa'], done: false })
    expect(iterator.next()).toEqual({ value: ['aa', 'a'], done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })

    const ambiguous2 = MonoParser(or([
      seq([fixed('a'), fixed('aa')]),
      seq([fixed('aa'), fixed('a')])
    ]))
    expect(() => ambiguous2('aaa')).toThrowError('Expected 1 result, got 2')
  })
})
