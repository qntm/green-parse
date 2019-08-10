const { Parser, resolve, seq, fixed, or, unicode, wseq, maybe } = require('../src/main.js')

// This object matches strings conforming to Wirth syntax notation.
// The output value is a matcher for strings conforming to the syntax described in the Wirth grammar.
const wirthSyntaxMatcher = resolve({
  SYNTAX: matchers => seq([
    matchers.whitespaces.maybe(),
    matchers.PRODUCTIONS,
    matchers.whitespaces.maybe()
  ])
    .map(([space1, productions, space2]) => ({ type: 'SYNTAX', productions })),

  PRODUCTIONS: matchers => matchers.PRODUCTION
    .wplus(matchers.whitespaces)
    .map(productions => ({ type: 'PRODUCTIONS', productions })),

  PRODUCTION: matchers => wseq([
    matchers.IDENTIFIER,
    fixed('='),
    matchers.EXPRESSION,
    fixed('.')
  ], matchers.whitespaces)
    .map(([identifier, equals, expression, dot]) => ({ type: 'PRODUCTION', identifier, expression })),

  EXPRESSION: matchers => matchers.TERM
    .wplus(seq([matchers.whitespaces, fixed('|'), matchers.whitespaces]))
    .map(terms => ({ type: 'EXPRESSION', terms })),

  TERM: matchers => matchers.FACTOR
    .wplus(matchers.whitespaces)
    .map(factors => ({ type: 'TERM', factors })),

  FACTOR: matchers => or([
    matchers.IDENTIFIER,
    matchers.LITERAL,
    matchers.OPTIONAL,
    matchers.GROUP,
    matchers.STAR
  ]),

  OPTIONAL: matchers =>
    wseq([fixed('['), matchers.EXPRESSION, fixed(']')], matchers.whitespaces)
      .map(([bracket1, expression, bracket2]) => ({ type: 'OPTIONAL', expression })),

  GROUP: matchers =>
    wseq([fixed('('), matchers.EXPRESSION, fixed(')')], matchers.whitespaces)
      .map(([paren1, expression, paren2]) => ({ type: 'GROUP', expression })),

  STAR: matchers =>
    wseq([fixed('{'), matchers.EXPRESSION, fixed('}')], matchers.whitespaces)
      .map(([brace1, expression, brace2]) => ({ type: 'STAR', expression })),

  IDENTIFIER: matchers => matchers.letter.plus()
    .map(letters => letters.join(''))
    .map(identifier => ({ type: 'IDENTIFIER', identifier })),

  LITERAL: matchers => seq([
    fixed('"'),
    matchers.character.plus()
      .map(characters => characters.join('')),
    fixed('"')
  ])
    .map(([quote1, chars, quote2]) => ({ type: 'LITERAL', chars })),

  letter: matchers =>
    or('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => fixed(ch))),

  character: matchers => or([
    unicode.filter(x => x !== '"'),
    fixed('""').map(match => '"')
  ]),

  whitespaces: matchers =>
    or(' \n\r\t'.split('').map(ch => fixed(ch))).plus()
}).SYNTAX.map(syntax => {
  const unresolveds = {}

  const constructMatcher = (matchers, thing) =>
    thing.type === 'EXPRESSION' ? or(thing.terms.map(term => constructMatcher(matchers, term)))
      : thing.type === 'TERM' ? seq(thing.factors.map(factor => constructMatcher(matchers, factor)))
        : thing.type === 'IDENTIFIER' ? matchers[thing.identifier]
          : thing.type === 'LITERAL' ? fixed(thing.chars)
            : thing.type === 'OPTIONAL' ? maybe(constructMatcher(matchers, thing.expression))
              : thing.type === 'GROUP' ? seq([constructMatcher(matchers, thing.expression)])
                : thing.type === 'STAR' ? constructMatcher(matchers, thing.expression).star()
                  : (() => {
                    throw Error('Unrecognised type: ' + thing.type)
                  })()

  syntax.productions.productions.forEach(production => {
    const identifier = production.identifier.identifier
    const unresolved = matchers => constructMatcher(matchers, production.expression)
    unresolveds[identifier] = unresolved
  })

  return resolve(unresolveds)
})

// For example, here's a Wirth syntax string which describes a language very similar
// to Wirth syntax notation.
const wirthSyntax = `
  SYNTAX     = [ whitespaces ] PRODUCTIONS [ whitespaces ] .
  PRODUCTIONS = PRODUCTION { whitespaces PRODUCTION } .
  PRODUCTION = IDENTIFIER whitespaces "=" whitespaces EXPRESSION whitespaces "." .
  EXPRESSION = TERM { whitespaces "|" whitespaces TERM } .
  TERM       = FACTOR { whitespaces FACTOR } .
  FACTOR     = LITERAL | IDENTIFIER | OPTIONAL | GROUP | STAR .
  OPTIONAL = "[" whitespaces EXPRESSION whitespaces "]" .
  GROUP = "(" whitespaces EXPRESSION whitespaces ")" .
  STAR = "{" whitespaces EXPRESSION whitespaces "}" .
  LITERAL    = """" character { character } """" .
  IDENTIFIER = letter { letter } .
  character  = letter | digit | "=" | "." | """""" | whitespace | symbol .
  letter     = upper | lower .
  digit      = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" .
  upper      = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" 
         | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" 
         | "U" | "V" | "W" | "X" | "Y" | "Z" .
  lower      = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" 
         | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" 
         | "u" | "v" | "w" | "x" | "y" | "z" .
  symbol = "{" | "}" | "|" | "[" | "]" | "(" | ")" .
  whitespaces = whitespace { whitespace } .
  whitespace = " " | "\n" | "\r" | "\t" .
`

// And here's how we construct a matcher for strings conforming to that syntax.
const wirthSyntaxMatcher2 = Parser(wirthSyntaxMatcher)(wirthSyntax).next().value.SYNTAX

// It can parse!
const parsed1 = Parser(wirthSyntaxMatcher2)('A = "A" .').next().value
console.log(JSON.stringify(parsed1))

// It can even consume itself!
// But the result is quite ugly since this second matcher doesn't know how to transform the result.
const parsed2 = Parser(wirthSyntaxMatcher2)(wirthSyntax).next().value
console.log(JSON.stringify(parsed2))
