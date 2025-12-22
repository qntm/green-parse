/* eslint-env mocha */

import assert from 'node:assert/strict'

import { fixed, or, seq, resolve } from '../src/matcher/index.js'

describe('grammar school', () => {
  it('fixed', () => {
    const matchA = fixed('a')
    assert.deepEqual([...matchA.match('a', 0)], [{ j: 1, match: 'a' }])
  })

  const matchLetter = or('abcdefghjklmnopqrstuvwxyz'.split(''))

  it('matchLetter', () => {
    assert.deepEqual([...matchLetter.match('f', 0)], [{ j: 1, match: 'f' }])
  })

  const matchDigit = or('0123456789'.split(''))

  it('matchDigit', () => {
    assert.deepEqual([...matchDigit.match('1', 0)], [{ j: 1, match: '1' }])
  })

  const matchString = seq(['\'', matchDigit, '\''])
    .map(([open, string, close]) => ({ string }))

  it('matchString', () => {
    assert.deepEqual([...matchString.match('\'0\'', 0)], [{ j: 3, match: { string: '0' } }])
  })

  const matchNonTerminal = matchLetter
    .map(nonTerminal => ({ nonTerminal }))

  const matchTerm = or([matchString, matchNonTerminal])

  it('matchTerm', () => {
    assert.deepEqual([...matchTerm.match('b', 0)], [{ j: 1, match: { nonTerminal: 'b' } }])
    assert.deepEqual([...matchTerm.match("'5'", 0)], [{ j: 3, match: { string: '5' } }])
  })

  const matchStarredTerm = seq([matchTerm, '*'])
    .map(([starredTerm, star]) => ({ starredTerm }))

  it('matchStarredTerm', () => {
    assert.deepEqual([...matchStarredTerm.match('b*', 0)], [
      { j: 2, match: { starredTerm: { nonTerminal: 'b' } } }
    ])
    assert.deepEqual([...matchStarredTerm.match("'5'*", 0)], [
      { j: 4, match: { starredTerm: { string: '5' } } }
    ])
  })

  const matchMaybeStarredTerm = or([matchStarredTerm, matchTerm])

  it('matchMaybeStarredTerm', () => {
    assert.deepEqual([...matchMaybeStarredTerm.match('b', 0)], [
      { j: 1, match: { nonTerminal: 'b' } }
    ])

    assert.deepEqual([...matchMaybeStarredTerm.match('b*', 0)], [
      { j: 2, match: { starredTerm: { nonTerminal: 'b' } } },
      { j: 1, match: { nonTerminal: 'b' } }
    ])

    assert.deepEqual([...matchMaybeStarredTerm.match("'5'", 0)], [
      { j: 3, match: { string: '5' } }
    ])

    assert.deepEqual([...matchMaybeStarredTerm.match("'5'*", 0)], [
      { j: 4, match: { starredTerm: { string: '5' } } },
      { j: 3, match: { string: '5' } }
    ])
  })

  const matchSequence = matchMaybeStarredTerm.plus()

  const matchProduction = matchSequence.plus('|')

  it('matchProduction', () => {
    assert.deepEqual([...matchProduction.match("a|a'5'*abc", 0)], [
      {
        j: 1,
        match: [[{ nonTerminal: 'a' }]]
      },
      {
        j: 3,
        match: [[{ nonTerminal: 'a' }], [{ nonTerminal: 'a' }]]
      }, {
        j: 7,
        match: [[{ nonTerminal: 'a' }], [{ nonTerminal: 'a' }, { starredTerm: { string: '5' } }]]
      }, {
        j: 8,
        match: [[{ nonTerminal: 'a' }], [{ nonTerminal: 'a' }, { starredTerm: { string: '5' } }, { nonTerminal: 'a' }]]
      }, {
        j: 9,
        match: [[{ nonTerminal: 'a' }], [{ nonTerminal: 'a' }, { starredTerm: { string: '5' } }, { nonTerminal: 'a' }, { nonTerminal: 'b' }]]
      }, {
        j: 10,
        match: [[{ nonTerminal: 'a' }], [{ nonTerminal: 'a' }, { starredTerm: { string: '5' } }, { nonTerminal: 'a' }, { nonTerminal: 'b' }, { nonTerminal: 'c' }]]
      }, {
        j: 6,
        match: [[{ nonTerminal: 'a' }], [{ nonTerminal: 'a' }, { string: '5' }]]
      }
    ])
  })

  const matchLeft = matchLetter
  const matchRule = seq([matchLeft, ':=', matchProduction, '\n'])
    .map(([left, equals, production, right]) => [left, production])

  it('matchRule', () => {
    assert.deepEqual([...matchRule.match("a:='0'b'1'\n", 0)], [
      {
        j: 11,
        match: [
          'a',
          [[{ string: '0' }, { nonTerminal: 'b' }, { string: '1' }]]
        ]
      }
    ])
  })

  const matchRules = matchRule.plus()
    .map(rules => Object.fromEntries(rules))

  it('matchRules', () => {
    assert.deepEqual([...matchRules.match("a:='0'b'1'\nb:='2'|'3'*\n", 0)], [
      {
        j: 11,
        match: {
          a: [[{ string: '0' }, { nonTerminal: 'b' }, { string: '1' }]]
        }
      },
      {
        j: 23,
        match: {
          a: [[{ string: '0' }, { nonTerminal: 'b' }, { string: '1' }]],
          b: [[{ string: '2' }], [{ starredTerm: { string: '3' } }]]
        }
      }
    ])
  })

  const rulesToMatchers = matchRules.map(rules =>
    resolve(ref =>
      Object.fromEntries(
        Object.entries(rules).map(([nonTerminal, rule]) => [
          nonTerminal,
          or(rule.map(sequence =>
            seq(sequence.map(term => {
              if ('starredTerm' in term) {
                if ('nonTerminal' in term.starredTerm) {
                  return ref(term.starredTerm.nonTerminal).star()
                }
                if ('string' in term.starredTerm) {
                  return fixed(term.starredTerm.string).star()
                }
              }
              if ('nonTerminal' in term) {
                return ref(term.nonTerminal)
              }
              if ('string' in term) {
                return fixed(term.string)
              }
              throw Error()
            }))
          ))
        ])
      )
    )
  )

  describe('rulesToMatchers', () => {
    it('one simple rule', () => {
      const matcher = [...rulesToMatchers.match("a:='0'\n", 0)][0].match.a
      assert.deepEqual([...matcher.match('0', 0)], [
        { j: 1, match: ['0'] }
      ])
    })

    it('one starred rule', () => {
      const matcher = [...rulesToMatchers.match("a:='3'*\n", 0)][0].match.a
      assert.deepEqual([...matcher.match('3', 0)], [
        { j: 0, match: [[]] },
        { j: 1, match: [['3']] }
      ])
    })

    it('one rule', () => {
      const matcher = [...rulesToMatchers.match("a:='0''3'*'1'\n", 0)][0].match.a
      assert.deepEqual([...matcher.match('0331', 0)], [
        { j: 4, match: ['0', ['3', '3'], '1'] }
      ])
    })

    it('two rules', () => {
      const matcher = [...rulesToMatchers.match("a:='0'b'1'\nb:='2'|'3'*\n", 0)][1].match.a
      assert.deepEqual([...matcher.match('0331', 0)], [
        { j: 4, match: ['0', [['3', '3']], '1'] }
      ])
    })

    it('parses', () => {
      const matcher = [...rulesToMatchers.match("a:='0'b'1'\nb:='2'|'3'*\n", 0)][1].match.a
      assert.deepEqual([...matcher.parse('0331')], [
        ['0', [['3', '3']], '1']
      ])
    })

    it('parse1s', () => {
      const matcher = [...rulesToMatchers.match("a:='0'b'1'\nb:='2'|'3'*\n", 0)][1].match.a
      assert.deepEqual(matcher.parse1('0331'), ['0', [['3', '3']], '1'])
    })
  })

  it('equivalent grammar', () => {
    const matcher = resolve(ref => ({
      a: or([
        seq(['0', ref('b'), '1'])
      ]),
      b: or([
        seq(['2']),
        seq([fixed('3').star()])
      ])
    })).a

    assert.deepEqual([...matcher.match('01', 0)], [{ j: 2, match: ['0', [[]], '1'] }])
    assert.deepEqual([...matcher.match('021', 0)], [{ j: 3, match: ['0', ['2'], '1'] }])
    assert.deepEqual([...matcher.match('031', 0)], [{ j: 3, match: ['0', [['3']], '1'] }])
    assert.deepEqual([...matcher.match('0331', 0)], [{ j: 4, match: ['0', [['3', '3']], '1'] }])
    assert.deepEqual([...matcher.parse('0331')], [['0', [['3', '3']], '1']])
    assert.deepEqual(matcher.parse1('0331'), ['0', [['3', '3']], '1'])
  })
})
