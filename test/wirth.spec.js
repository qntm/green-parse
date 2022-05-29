/* eslint-env mocha */

import assert from 'assert'

import wirthGrammar from '../examples/wirth.js'

describe('Wirth grammar', () => {
  it('works', () => {
    const wirthSyntaxString = `
      SYNTAX      = [ whitespaces ] PRODUCTIONS [ whitespaces ] .
      PRODUCTIONS = PRODUCTION { whitespaces PRODUCTION } .
      PRODUCTION  = IDENTIFIER whitespaces "=" whitespaces EXPRESSION whitespaces "." .
      EXPRESSION  = TERM { whitespaces "|" whitespaces TERM } .
      TERM        = FACTOR { whitespaces FACTOR } .
      FACTOR      = LITERAL | IDENTIFIER | OPTIONAL | GROUP | STAR .
      OPTIONAL    = "[" whitespaces EXPRESSION whitespaces "]" .
      GROUP       = "(" whitespaces EXPRESSION whitespaces ")" .
      STAR        = "{" whitespaces EXPRESSION whitespaces "}" .
      LITERAL     = """" character { character } """" .
      IDENTIFIER  = letter { letter } .
      character   = letter | digit | "=" | "." | """""" | whitespace | symbol .
      letter      = upper | lower .
      digit       = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" .
      upper       = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" 
                  | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" 
                  | "U" | "V" | "W" | "X" | "Y" | "Z" .
      lower       = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" 
                  | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" 
                  | "u" | "v" | "w" | "x" | "y" | "z" .
      symbol      = "{" | "}" | "|" | "[" | "]" | "(" | ")" .
      whitespaces = whitespace { whitespace } .
      whitespace  = " " | "\n" | "\r" | "\t" .
    `

    // And here's how we construct a matcher for strings conforming to that syntax.
    const grammar2 = wirthGrammar.SYNTAX.parse1(wirthSyntaxString)

    // It can parse!
    const match3 = grammar2.SYNTAX.parse1(' A = "A" . ')
    const whitespaces = [[' '], []]
    assert.deepStrictEqual(match3, [
      [[whitespaces]],
      [
        // first PRODUCTION
        [
          // IDENTIFIER
          [
            // first letter
            [
              // upper
              ['A']
            ],

            // all other letters
            []
          ],

          whitespaces,
          '=',
          whitespaces,

          // EXPRESSION
          [
            // first TERM
            [
              // first FACTOR
              [
                // LITERAL
                [
                  '"',

                  // first character
                  [
                    // letter
                    [
                      // upper
                      ['A']
                    ]
                  ],

                  // all other characters
                  [],

                  '"'
                ]
              ],

              // all other FACTORs
              []
            ],

            // all other TERMs
            []
          ],

          whitespaces,
          '.'
        ],

        // all other PRODUCTIONs
        []
      ],
      [[whitespaces]]
    ])

    // It can even parse itself!
    // But the result is quite ugly since `matcher2` doesn't know how to transform the result.
    assert.doesNotThrow(() => grammar2.SYNTAX.parse1(wirthSyntaxString))
  })

  it('does groups', () => {
    const wirthSyntaxString = `
      thing = "a" ( "b" ) "d" .
    `

    const grammar2 = wirthGrammar.SYNTAX.parse1(wirthSyntaxString)
    assert.deepStrictEqual(grammar2.thing.parse1('abd'), ['a', [['b']], 'd'])
  })
})
