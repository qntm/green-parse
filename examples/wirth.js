import { resolve, seq, or, UNICODE, fixed } from '../src/matcher/index.js'

// This object matches strings conforming to Wirth syntax notation.
// The output value is a matcher for strings conforming to the syntax described in the Wirth grammar.
export default resolve(ref => ({
  SYNTAX: seq([ref('s').maybe(), ref('PRODUCTIONS'), ref('s').maybe()])
    .map(([space1, productions, space2]) => resolve(ref2 => {
      const constructMatcher = thing => {
        switch (thing.type) {
          case 'EXPRESSION': {
            return or(thing.terms.map(constructMatcher))
          }
          case 'TERM': {
            return seq(thing.factors.map(constructMatcher))
          }
          case 'IDENTIFIER': {
            return ref2(thing.identifier)
          }
          case 'LITERAL': {
            return fixed(thing.chars)
          }
          case 'OPTIONAL': {
            return constructMatcher(thing.expression).maybe()
          }
          case 'GROUP': {
            return seq([constructMatcher(thing.expression)])
          }
          case 'STAR': {
            return constructMatcher(thing.expression).star()
          }

          /* node:coverage disable */
          default: {
            // This should be impossible
            throw Error('Unrecognised type: ' + thing.type)
          }
          /* node:coverage enable */
        }
      }

      return Object.fromEntries(
        productions.map(production => [
          production.identifier.identifier,
          constructMatcher(production.expression)
        ])
      )
    })),

  PRODUCTIONS: ref('PRODUCTION').plus(ref('s')),

  PRODUCTION: seq([ref('IDENTIFIER'), '=', ref('EXPRESSION'), '.'], ref('s'))
    .map(([identifier, equals, expression, dot]) => ({ identifier, expression })),

  EXPRESSION: ref('TERM').plus(seq([ref('s'), '|', ref('s')]))
    .map(terms => ({ type: 'EXPRESSION', terms })),

  TERM: ref('FACTOR').plus(ref('s'))
    .map(factors => ({ type: 'TERM', factors })),

  FACTOR: or([ref('IDENTIFIER'), ref('LITERAL'), ref('OPTIONAL'), ref('GROUP'), ref('STAR')]),

  OPTIONAL: seq(['[', ref('EXPRESSION'), ']'], ref('s'))
    .map(([open, expression, close]) => ({ type: 'OPTIONAL', expression })),

  GROUP: seq(['(', ref('EXPRESSION'), ')'], ref('s'))
    .map(([open, expression, close]) => ({ type: 'GROUP', expression })),

  STAR: seq(['{', ref('EXPRESSION'), '}'], ref('s'))
    .map(([open, expression, close]) => ({ type: 'STAR', expression })),

  IDENTIFIER: ref('letter').plus()
    .map(letters => ({ type: 'IDENTIFIER', identifier: letters.join('') })),

  LITERAL: seq(['"', ref('character').plus(), '"'])
    .map(([open, chars, close]) => ({ type: 'LITERAL', chars: chars.join('') })),

  letter: /^[a-zA-Z]/,

  character: or([
    UNICODE.filter(x => x !== '"'),
    fixed('""').map(() => '"')
  ]),

  s: /^[ \n\r\t]+/
}))
