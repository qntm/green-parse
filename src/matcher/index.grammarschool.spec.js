/* eslint-env jest */

const { fixed, or, seq, plus, star, resolve } = require('.')

describe('grammar school', () => {
  it('fixed', () => {
    const matchA = fixed('a')
    expect([...matchA.match('a', 0)]).toEqual([{ j: 1, match: 'a' }])
  })

  const matchLetter = or('abcdefghjklmnopqrstuvwxyz'.split(''))

  it('matchLetter', () => {
    expect([...matchLetter.match('f', 0)]).toEqual([{ j: 1, match: 'f' }])
  })

  const matchDigit = or('0123456789'.split(''))

  it('matchDigit', () => {
    expect([...matchDigit.match('1', 0)]).toEqual([{ j: 1, match: '1' }])
  })

  const matchString = seq(['\'', matchDigit, '\''])
    .map(([open, string, close]) => ({ string }))

  it('matchString', () => {
    expect([...matchString.match('\'0\'', 0)]).toEqual([{ j: 3, match: { string: '0' } }])
  })

  const matchNonTerminal = matchLetter
    .map(nonTerminal => ({ nonTerminal }))

  const matchTerm = or([matchString, matchNonTerminal])

  it('matchTerm', () => {
    expect([...matchTerm.match('b', 0)]).toEqual([{ j: 1, match: { nonTerminal: 'b' } }])
    expect([...matchTerm.match("'5'", 0)]).toEqual([{ j: 3, match: { string: '5' } }])
  })

  const matchStarredTerm = seq([matchTerm, '*'])
    .map(([starredTerm, star]) => ({ starredTerm }))

  it('matchStarredTerm', () => {
    expect([...matchStarredTerm.match('b*', 0)]).toEqual([
      { j: 2, match: { starredTerm: { nonTerminal: 'b' } } }
    ])
    expect([...matchStarredTerm.match("'5'*", 0)]).toEqual([
      { j: 4, match: { starredTerm: { string: '5' } } }
    ])
  })

  const matchMaybeStarredTerm = or([matchStarredTerm, matchTerm])

  it('matchMaybeStarredTerm', () => {
    expect([...matchMaybeStarredTerm.match('b', 0)]).toEqual([
      { j: 1, match: { nonTerminal: 'b' } }
    ])

    expect([...matchMaybeStarredTerm.match('b*', 0)]).toEqual([
      { j: 2, match: { starredTerm: { nonTerminal: 'b' } } },
      { j: 1, match: { nonTerminal: 'b' } }
    ])

    expect([...matchMaybeStarredTerm.match("'5'", 0)]).toEqual([
      { j: 3, match: { string: '5' } }
    ])

    expect([...matchMaybeStarredTerm.match("'5'*", 0)]).toEqual([
      { j: 4, match: { starredTerm: { string: '5' } } },
      { j: 3, match: { string: '5' } }
    ])
  })

  const matchSequence = matchMaybeStarredTerm.plus()

  const matchProduction = plus(matchSequence, '|')

  it('matchProduction', () => {
    expect([...matchProduction.match("a|a'5'*abc", 0)]).toEqual([
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
    expect([...matchRule.match("a:='0'b'1'\n", 0)]).toEqual([
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
    expect([...matchRules.match("a:='0'b'1'\nb:='2'|'3'*\n", 0)]).toEqual([
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
      expect([...matcher.match('0', 0)]).toEqual([
        { j: 1, match: ['0'] }
      ])
    })

    it('one starred rule', () => {
      const matcher = [...rulesToMatchers.match("a:='3'*\n", 0)][0].match.a
      expect([...matcher.match('3', 0)]).toEqual([
        { j: 0, match: [[]] },
        { j: 1, match: [['3']] }
      ])
    })

    it('one rule', () => {
      const matcher = [...rulesToMatchers.match("a:='0''3'*'1'\n", 0)][0].match.a
      expect([...matcher.match('0331', 0)]).toEqual([
        { j: 4, match: ['0', ['3', '3'], '1'] }
      ])
    })

    it('two rules', () => {
      const matcher = [...rulesToMatchers.match("a:='0'b'1'\nb:='2'|'3'*\n", 0)][1].match.a
      expect([...matcher.match('0331', 0)]).toEqual([
        { j: 4, match: ['0', [['3', '3']], '1'] }
      ])
    })

    it('parses', () => {
      const matcher = [...rulesToMatchers.match("a:='0'b'1'\nb:='2'|'3'*\n", 0)][1].match.a
      expect([...matcher.parse('0331')]).toEqual([
        ['0', [['3', '3']], '1']
      ])
    })

    it('parse1s', () => {
      const matcher = [...rulesToMatchers.match("a:='0'b'1'\nb:='2'|'3'*\n", 0)][1].match.a
      expect(matcher.parse1('0331')).toEqual(['0', [['3', '3']], '1'])
    })
  })

  it('equivalent grammar', () => {
    const matcher = resolve(ref => ({
      a: or([
        seq(['0', ref('b'), '1'])
      ]),
      b: or([
        seq(['2']),
        seq([star('3')])
      ])
    })).a

    expect([...matcher.match('01', 0)]).toEqual([{ j: 2, match: ['0', [[]], '1'] }])
    expect([...matcher.match('021', 0)]).toEqual([{ j: 3, match: ['0', ['2'], '1'] }])
    expect([...matcher.match('031', 0)]).toEqual([{ j: 3, match: ['0', [['3']], '1'] }])
    expect([...matcher.match('0331', 0)]).toEqual([{ j: 4, match: ['0', [['3', '3']], '1'] }])
    expect([...matcher.parse('0331')]).toEqual([['0', [['3', '3']], '1']])
    expect(matcher.parse1('0331')).toEqual(['0', [['3', '3']], '1'])
  })
})
