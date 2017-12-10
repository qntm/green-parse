const {Parser, resolve, seq, fixed, plus, or, unicode, star, wplus, wseq} = require('../src/main.js')

// This object matches JSON strings.
const jsonMatcher = resolve({
  topobject: matchers => seq([matchers.WHITESPACE, matchers.object, matchers.WHITESPACE])
    .map(([space1, object, space2]) => object),

  object: matchers => or([
    matchers.fullobject,
    matchers.emptyobject
  ]),

  emptyobject: matchers => wseq([
    fixed('{'),
    fixed('}')
  ], matchers.WHITESPACE)
    .map(() => ({})),

  fullobject: matchers => wseq([
    fixed('{'),
    matchers.keyvalue.wplus(seq([matchers.WHITESPACE, fixed(','), matchers.WHITESPACE])),
    fixed('}')
  ], matchers.WHITESPACE)
    .map(([open, keyvalues, close]) => {
      const obj = {}
      keyvalues.forEach(({key, value}) => {
        obj[key] = value
      })
      return obj
    }),

  keyvalue: matchers => wseq([matchers.string, fixed(':'), matchers.value], matchers.WHITESPACE)
    .map(([key, colon, value]) => ({key, value})),

  array: matchers => or([
    matchers.fullarray,
    matchers.emptyarray
  ]),

  emptyarray: matchers => wseq([
    fixed('['),
    fixed(']')
  ], matchers.WHITESPACE)
    .map(() => []),

  fullarray: matchers => wseq([
    fixed('['),
    matchers.value.wplus(seq([matchers.WHITESPACE, fixed(','), matchers.WHITESPACE])),
    fixed(']')
  ], matchers.WHITESPACE)
    .map(([open, array, closed]) => array),

  value: matchers => or([
    matchers.object,
    matchers.array,
    matchers.string,
    matchers.number,
    fixed('true').map(() => true),
    fixed('false').map(() => false),
    fixed('null').map(() => null)
  ]),

  string: matchers => seq([
    fixed('"'),
    matchers.char.star().map(chars => chars.join('')),
    fixed('"')
  ])
    .map(([open, string, close]) => string),

  'char': matchers => or([
    unicode.filter(match => match !== '"' && match !== '\\'), // TODO: also exclude controls
    fixed('\\"').map(() => '"'),
    fixed('\\\\').map(() => '\\'),
    fixed('\\/').map(() => '/'),
    fixed('\\b').map(() => '\x08'),
    fixed('\\f').map(() => '\f'),
    fixed('\\n').map(() => '\n'),
    fixed('\\r').map(() => '\r'),
    fixed('\\t').map(() => '\t'),
    seq([
      fixed('\\u'),
      or('0123456789abcdefABCDEF'.split('').map(fixed)),
      or('0123456789abcdefABCDEF'.split('').map(fixed)),
      or('0123456789abcdefABCDEF'.split('').map(fixed)),
      or('0123456789abcdefABCDEF'.split('').map(fixed))
    ])
      .map(([u, digit1, digit2, digit3, digit4]) =>
        String.fromCharCode(Number.parseInt(digit1 + digit2 + digit3 + digit4, 0x10))
      )
  ]),

  WHITESPACE: matchers => or([fixed(' '), fixed('\n'), fixed('\r'), fixed('\t')]).star(),

  number: matchers => seq([
    fixed('-').maybe(),
    or([
      fixed('0'),
      seq([
        or('123456789'.split('').map(fixed)),
        or('0123456789'.split('').map(fixed)).star().map(digits => digits.join(''))
      ]).map(([nonzerodigit, digits]) => nonzerodigit + digits)
    ]),
    seq([
      fixed('.'),
      or('0123456789'.split('').map(fixed)).plus().map(digits => digits.join(''))
    ]).map(([dot, digits]) => dot + digits).maybe(),
    seq([
      or([fixed('e'), fixed('E')]),
      or([fixed('-'), fixed('+'), fixed('')]),
      or('0123456789'.split('').map(fixed)).plus().map(digits => digits.join(''))
    ]).map(([exponent, sign, digits]) => exponent + sign + digits).maybe()
  ]).map(([sign, integer, decimal, exponent]) => Number.parseFloat(sign + integer + decimal + exponent))
}).topobject

// Needed: `maybe`

const object = jsonMatcher(" { \"string\" : true, \"\\\"\" : false, \"\\u9874asdh\" : [ null, { }, -9488.44E+093 ] } ", 0).next().value.match;

console.log(object)
console.log(Object.keys(object).length === 3)
console.log(object.string === true)
console.log(object['"'] === false)
console.log(object['\u9874asdh'].length === 3)
console.log(object['\u9874asdh'][0] === null)
console.log(Object.keys(object['\u9874asdh'][1]).length === 0)
console.log(object['\u9874asdh'][2] === -9.48844E+96)

// failure modes
const strings = [
  '{ "string ',       // incomplete string
  '{ "\\UAAAA" ',     // capital U on unicode char
  '{ "\\u000i" ',     // not enough hex digits on unicode char
  '{ "a" : tru ',     // incomplete "true"
  '{ "a" :  +9 ',     // leading +
  '{ "a" :  9. ',     // missing decimal digits
  '{ "a" :  0a8.52 ', // extraneous "a"
  '{ "a" :  8E ',     // missing exponent
  '{ "a" :  08 ',     // Two numbers side by side.
  '[ "a" ,  8 ]',     // Not an object at the top level.
  ' "a" ',            // Not an object at the top level.
  '{"\x00"    :7}',   // string contains a literal control character
  '{"\xC2\x9F":8}',   // string contains a literal control character
  '{"\n"      :9}',   // string contains a literal control character
  '{"\r"      :1}',   // string contains a literal control character
  '{"\t"      :2}'    // string contains a literal control character
]
strings.forEach(string => {
  console.log(jsonMatcher(string, 0).next().done === true)
})
