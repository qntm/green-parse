/* eslint-env jasmine */

'use strict'

const {fixed, or, seq, wplus, resolve, star, Parser} = require('../src/main.js')

describe('grammar school', () => {
  it('fixed', () => {
    const iterator = fixed('a')('a', 0)
    expect(iterator.next()).toEqual({value: {j: 1, match: 'a'}, done: false})
    expect(iterator.next()).toEqual({done: true})
  })

  const matchLetter = or('abcdefghjklmnopqrstuvwxyz'.split('').map(fixed))

  it('matchLetter', () => {
    const iterator = matchLetter('f', 0)
    expect(iterator.next()).toEqual({value: {j: 1, match: 'f'}, done: false})
    expect(iterator.next()).toEqual({done: true})
  })

  const matchDigit = or('0123456789'.split('').map(fixed))

  it('matchDigit', () => {
    const iterator = matchDigit('1', 0)
    expect(iterator.next()).toEqual({value: {j: 1, match: '1'}, done: false})
    expect(iterator.next()).toEqual({done: true})
  })

  const matchString = seq([fixed("'"), matchDigit, fixed("'")])
    .map(([open, string, close]) => ({string}))

  it('matchString', () => {
    const iterator = matchString("'0'", 0)
    expect(iterator.next()).toEqual({value: {j: 3, match: {string: '0'}}, done: false})
    expect(iterator.next()).toEqual({done: true})
  })

  const matchNonTerminal = matchLetter
    .map(nonTerminal => ({nonTerminal}))

  const matchTerm = or([matchString, matchNonTerminal])

  it('matchTerm', () => {
    const iterator = matchTerm('b', 0)
    expect(iterator.next().value).toEqual({j: 1, match: {nonTerminal: 'b'}})

    const iterator2 = matchTerm("'5'", 0)
    expect(iterator2.next().value).toEqual({j: 3, match: {string: '5'}})
  })

  const matchStarredTerm = seq([matchTerm, fixed('*')])
    .map(([starredTerm, star]) => ({starredTerm}))

  it('matchStarredTerm', () => {
    const iterator = matchStarredTerm('b*', 0)
    expect(iterator.next().value).toEqual({j: 2, match: {starredTerm: {nonTerminal: 'b'}}})

    const iterator2 = matchStarredTerm("'5'*", 0)
    expect(iterator2.next().value).toEqual({j: 4, match: {starredTerm: {string: '5'}}})
  })

  const matchMaybeStarredTerm = or([matchStarredTerm, matchTerm])

  it('matchMaybeStarredTerm', () => {
    const iterator = matchMaybeStarredTerm('b', 0)
    expect(iterator.next().value).toEqual({j: 1, match: {nonTerminal: 'b'}})

    const iterator2 = matchMaybeStarredTerm('b*', 0)
    expect(iterator2.next().value).toEqual({j: 2, match: {starredTerm: {nonTerminal: 'b'}}})

    const iterator3 = matchMaybeStarredTerm("'5'", 0)
    expect(iterator3.next().value).toEqual({j: 3, match: {string: '5'}})

    const iterator4 = matchMaybeStarredTerm("'5'*", 0)
    expect(iterator4.next().value).toEqual({j: 4, match: {starredTerm: {string: '5'}}})
  })

  const matchSequence = matchMaybeStarredTerm.plus()

  const matchProduction = wplus(matchSequence, fixed('|'))

  it('matchProduction', () => {
    const iterator = matchProduction("a|a'5'*abc", 0)
    expect(iterator.next().value).toEqual({
      j: 1,
      match: [[{nonTerminal: 'a'}]]
    })
    expect(iterator.next().value).toEqual({
      j: 3,
      match: [[{nonTerminal: 'a'}], [{nonTerminal: 'a'}]]
    })
    expect(iterator.next().value).toEqual({
      j: 7,
      match: [[{nonTerminal: 'a'}], [{nonTerminal: 'a'}, {starredTerm: {string: '5'}}]]
    })
    expect(iterator.next().value).toEqual({
      j: 8,
      match: [[{nonTerminal: 'a'}], [{nonTerminal: 'a'}, {starredTerm: {string: '5'}}, {nonTerminal: 'a'}]]
    })
    expect(iterator.next().value).toEqual({
      j: 9,
      match: [[{nonTerminal: 'a'}], [{nonTerminal: 'a'}, {starredTerm: {string: '5'}}, {nonTerminal: 'a'}, {nonTerminal: 'b'}]]
    })
    expect(iterator.next().value).toEqual({
      j: 10,
      match: [[{nonTerminal: 'a'}], [{nonTerminal: 'a'}, {starredTerm: {string: '5'}}, {nonTerminal: 'a'}, {nonTerminal: 'b'}, {nonTerminal: 'c'}]]
    })

    // This one is last, because of depth-first traversal
    expect(iterator.next().value).toEqual({
      j: 6,
      match: [[{nonTerminal: 'a'}], [{nonTerminal: 'a'}, {string: '5'}]]
    })
    expect(iterator.next()).toEqual({done: true})
  })

  const matchLeft = matchLetter
  const matchRule = seq([matchLeft, fixed(':='), matchProduction, fixed('\n')])
    .map(([left, equals, production, right]) => ({left, production}))

  it('matchRule', () => {
    const iterator = matchRule("a:='0'b'1'\n", 0)
    expect(iterator.next().value).toEqual({
      j: 11,
      match: {
        left: 'a',
        production: [[{string: '0'}, {nonTerminal: 'b'}, {string: '1'}]]
      }
    })
    expect(iterator.next()).toEqual({done: true})
  })

  const matchRules = matchRule.plus()
    .map(match => {
      const byName = {}
      match.forEach(({left, production}) => {
        byName[left] = production
      })
      return byName
    })

  it('matchRules', () => {
    const iterator = matchRules("a:='0'b'1'\nb:='2'|'3'*\n", 0)
    expect(iterator.next().value).toEqual({
      j: 11,
      match: {
        a: [[{string: '0'}, {nonTerminal: 'b'}, {string: '1'}]]
      }
    })
    expect(iterator.next().value).toEqual({
      j: 23,
      match: {
        a: [[{string: '0'}, {nonTerminal: 'b'}, {string: '1'}]],
        b: [[{string: '2'}], [{starredTerm: {string: '3'}}]]
      }
    })
  })

  const parseRules = Parser(matchRules)

  it('parseRules', () => {
    const iterator = parseRules("a:='0'b'1'\nb:='2'|'3'*\n", 0)
    expect(iterator.next().value).toEqual({
      a: [[{string: '0'}, {nonTerminal: 'b'}, {string: '1'}]],
      b: [[{string: '2'}], [{starredTerm: {string: '3'}}]]
    })
  })

  const rulesToMatchers = rules => {
    const unresolved = {}
    Object.keys(rules).forEach(key => {
      unresolved[key] = matchers => or(rules[key].map(sequence =>
        seq(sequence.map(term => {
          if ('starredTerm' in term) {
            if ('nonTerminal' in term.starredTerm) {
              return matchers[term.starredTerm.nonTerminal].star()
            }
            if ('string' in term.starredTerm) {
              return fixed(term.starredTerm.string).star()
            }
          }
          if ('nonTerminal' in term) {
            return matchers[term.nonTerminal]
          }
          if ('string' in term) {
            return fixed(term.string)
          }
          throw Error()
        }))
      ))
    })
    return resolve(unresolved)
  }

  describe('rulesToMatcher', () => {
    it('one simple rule', () => {
      const iterator = parseRules("a:='0'\n", 0)
      const rules = iterator.next().value
      expect(rules).toEqual({
        a: [[{string: '0'}]]
      })

      const matchers = rulesToMatchers(rules)
      const iterator2 = matchers.a('0', 0)
      expect(iterator2.next().value).toEqual({
        j: 1,
        match: ['0']
      })
    })

    it('one starred rule', () => {
      const iterator = parseRules("a:='3'*\n", 0)
      const rules = iterator.next().value
      expect(rules).toEqual({
        a: [[{starredTerm: {string: '3'}}]]
      })

      const matchers = rulesToMatchers(rules)
      const iterator2 = matchers.a('3', 0)
      expect(iterator2.next().value).toEqual({
        j: 0,
        match: [[]]
      })
      expect(iterator2.next().value).toEqual({
        j: 1,
        match: [['3']]
      })
    })

    it('one rule', () => {
      const iterator = parseRules("a:='0''3'*'1'\n", 0)
      const rules = iterator.next().value
      expect(rules).toEqual({
        a: [[{string: '0'}, {starredTerm: {string: '3'}}, {string: '1'}]]
      })

      const matchers = rulesToMatchers(rules)
      const iterator2 = matchers.a('0331', 0)
      expect(iterator2.next().value).toEqual({
        j: 4,
        match: ['0', ['3', '3'], '1']
      })
    })

    it('two rules', () => {
      const iterator = parseRules("a:='0'b'1'\nb:='2'|'3'*\n", 0)
      const rules = iterator.next().value
      expect(rules).toEqual({
        a: [[{string: '0'}, {nonTerminal: 'b'}, {string: '1'}]],
        b: [[{string: '2'}], [{starredTerm: {string: '3'}}]]
      })

      const matchers = rulesToMatchers(rules)
      const iterator2 = matchers.a('0331', 0)
      expect(iterator2.next().value).toEqual({
        j: 4,
        match: ['0', [['3', '3']], '1']
      })
    })
  })

  it('equivalent grammar', () => {
    const grammar = resolve({
      a: matchers => or([
        seq([fixed('0'), matchers.b, fixed('1')])
      ]),
      b: matchers => or([
        seq([fixed('2')]),
        seq([star(fixed('3'))])
      ])
    })

    const iterator1 = grammar.a('01', 0)
    expect(iterator1.next().value).toEqual({
      j: 2,
      match: ['0', [[]], '1']
    })

    const iterator2 = grammar.a('021', 0)
    expect(iterator2.next().value).toEqual({
      j: 3,
      match: ['0', ['2'], '1']
    })

    const iterator3 = grammar.a('031', 0)
    expect(iterator3.next().value).toEqual({
      j: 3,
      match: ['0', [['3']], '1']
    })

    const iterator4 = grammar.a('0331', 0)
    expect(iterator4.next().value).toEqual({
      j: 4,
      match: ['0', [['3', '3']], '1']
    })
  })
})
