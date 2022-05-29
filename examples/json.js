import {
  fixed,
  regex,
  seq,
  or,
  EMPTY,
  UNICODE,
  times,
  resolve,
  map,
  filter
} from '../src/simple/index.js'

export default resolve(ref => ({
  topvalue: map(
    seq([ref('ws'), ref('value'), ref('ws')], EMPTY),
    ([space1, value, space2]) => value
  ),

  value: or([
    ref('object'),
    ref('array'),
    ref('string'),
    ref('number'),
    ref('true'),
    ref('false'),
    ref('null')
  ]),

  object: map(
    seq([fixed('{'), ref('ws'), ref('keyvalues'), fixed('}')], EMPTY),
    ([open, space1, keyvalues, close]) => Object.fromEntries(keyvalues)
  ),

  keyvalues: times(
    ref('keyvalue'),
    0,
    Infinity,
    seq([fixed(','), ref('ws')], EMPTY)
  ),

  keyvalue: map(
    seq([ref('string'), ref('ws'), fixed(':'), ref('ws'), ref('value'), ref('ws')], EMPTY),
    ([key, space1, colon, space2, value, space3]) => [key, value]
  ),

  array: map(
    seq([fixed('['), ref('ws'), ref('arrayvalues'), fixed(']')], EMPTY),
    ([open, space1, values, close]) => values
  ),

  arrayvalues: times(
    ref('arrayvalue'),
    0,
    Infinity,
    seq([fixed(','), ref('ws')], EMPTY)
  ),

  arrayvalue: map(
    seq([ref('value'), ref('ws')], EMPTY),
    ([value, space]) => value
  ),

  string: map(
    seq([fixed('"'), times(ref('char'), 0, Infinity, EMPTY), fixed('"')], EMPTY),
    ([open, chars, close]) => chars.join('')
  ),

  char: or([
    filter(UNICODE, match =>
      match !== '"' &&
      match !== '\\' &&
      match.charCodeAt(0) > 0x1F // U+007F DEL is not considered a control character!
    ),
    map(fixed('\\"'), () => '"'),
    map(fixed('\\\\'), () => '\\'),
    map(fixed('\\/'), () => '/'),
    map(fixed('\\b'), () => '\x08'),
    map(fixed('\\f'), () => '\f'),
    map(fixed('\\n'), () => '\n'),
    map(fixed('\\r'), () => '\r'),
    map(fixed('\\t'), () => '\t'),
    map(
      regex(/^\\u([0-9a-fA-F]{4})/),
      result => String.fromCharCode(Number.parseInt(result[1], 0x10))
    )
  ]),

  number: map(
    regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?/),
    result => Number.parseFloat(result[0])
  ),

  true: map(fixed('true'), () => true),

  false: map(fixed('false'), () => false),

  null: map(fixed('null'), () => null),

  ws: regex(/^[ \n\r\t]*/)
}))
