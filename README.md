# green-parse

This is a small recursive descent parsing library which I built mainly for my own use.

## Installation

```bash
npm install green-parse
```

## Example

```js
const { fixed, or, seq } = require('green-parse')

const matchZero = fixed('0')
  .map(() => 0)

const matchNonZeroDigit = or(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
  .map(match => Number.parseInt(match, 10))

const matchDigit = or(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
  .map(match => Number.parseInt(match, 10))

const matchDigits = matchDigit.star()

const matchPositiveInteger = seq([matchNonZeroDigit, matchDigits])
  .map(([nonZeroDigit, digits]) => digits.reduce((acc, digit) => acc * 10 + digit, nonZeroDigit))

for (const value of matchPositiveInteger.match('923510', 2)) {
  // this loop body is executed four times, with the following `value`s:
  // { j: 3, match: 3 }
  // { j: 4, match: 35 }
  // { j: 5, match: 351 }
  // { j: 6, match: 3510 }
}
```

## API

`green-parse` works with objects called *matchers* and provides various methods for constructing and manipulating these objects, as well as a few canned matcher objects.

### fixed(str)

Returns a matcher which matches a fixed substring in the input.

```js
const { fixed } = require('green-parse')

const bMatcher = fixed('b')

for (const value of bMatcher.match('abc', 1)) {
  // this loop body is executed once
  // `value` is { j: 2, match: 'b' }
}

for (const value of bMatcher.match('ddd', 1)) {
  // this loop body is never executed
}
```

### EMPTY

Equivalent to `fixed('')`.

```js
const { EMPTY } = require('green-parse')

for (const value of EMPTY.match('abc', 1)) {
  // this loop body is executed once
  // `value` is { j: 1, match: '' }
}
```

### CHR

Matches a single character from the input string. Note that a JavaScript `String` object is a sequence of 16-bit code units, with Unicode characters outside the Basic Multilingual Plane encoded as a *surrogate pair* of code units. This matcher **does not know this**. Its matches are *always* strings with a `length` of `1`, even if that happens to be a lone surrogate.

```js
const { CHR } = require('green-parse')

for (const value of CHR.match('abc', 1)) {
  // this loop body is executed once
  // `value` is { j: 2, match: 'b' }
}
```

### UNICODE

Matches a single Unicode character from a string. In the case of characters outside the Basic Multilingual Plane, the match will be a string of `length` `2`, not `1`. If surrogates in the string are not paired correctly, this matcher will yield no matches.

### regex(regExp)

Returns a matcher which matches this regular expression *at the specified location* in the input. `regExp` must be a `RegExp` object *without* the global flag set and it must be anchored at the "start" of the current substring using `^`. The match value is an array containing all the regular expression's group matches.

```js
const { regex } = require('green-parse')

const numberMatcher = regex(/^([1-9])([0-9]*)/)

for (const value of numberMatcher.match('07734', 2)) {
  // this loop body is executed once
  // `value` is { j: 5, match: ['734', '7', '34'] }
}
```

### or(inners)

Takes an array `inners` of existing matcher objects and returns a new matcher which systematically returns all of the results from each inner matcher in turn.

If an entry in `inners` is a string, it is promoted to a `fixed` matcher. If it is a regular expression, it is promoted to a `regex` matcher.

```js
const { or } = require('green-parse')

const aorbMatcher = or(['a', 'b'])

for (const value of aorbMatcher.match('a', 0)) {
  // this loop body is executed once
  // `value` is { j: 1, match: 'a' } }
}

for (const value of aorbMatcher.match('b', 0)) {
  // this loop body is executed once
  // `value` is { j: 1, match: 'b' } }
}
```

### maybe(inner)

Equivalent to `or(['', inner])`.

### times(inner, min, max[, separator])

Match a sequence of `min` to `max` inclusive copies of `inner` in a row. Proceeds depth-first. Results are arrays of inner matches. If `separator` is included, it is matched between each inner match, but the separator match is ignored.

If `inner` or `separator` is a string, it is promoted to a `fixed` matcher. If `inner` or `separator` is a `RegExp` object, it is promoted to a `regex` matcher.

```js
const { times } = require('green-parse')

const multiMatcher = times('a', 2, 4)

for (const value of multiMatcher.match('aaaaaaaaaaaaa', 2)) {
  // this loop body is executed three times with the following `value`s:
  // { j: 3, match: ['a', 'a'] }
  // { j: 4, match: ['a', 'a', 'a'] }
  // { j: 5, match: ['a', 'a', 'a', 'a'] }
}
```

### star(inner[, separator])

Equivalent to `times(inner, 0, Infinity[, separator])`.

### plus(matcher[, separator])

Equivalent to `times(inner, 1, Infinity[, separator])`.

### seq(inners[, separator])

Takes an array `inners` of existing matchers and returns a new matcher which applies all of the inner matchers in sequence. Each match returned by `seq` is an array of the matches from each inner matcher. Proceeds depth-first.

If a matcher `separator` is provided, it will be matched between each entry in `inners`, but the matched value will be discarded.

If one of the entries in `inners` is a string, it is promoted to a `fixed` matcher for that string. If it is a `RegExp` object, it is promoted to a `regex` matcher. The same is true of `separator`.

```js
const { seq, star } = require('green-parse')

const abcMatcher = seq(['a', 'b', 'c'], star(' '))

for (const value of abcMatcher.match('a  b    c', 0)) {
  // this loop body is executed once
  // `value` is { j: 9, match: ['a', 'b', 'c'] } }
}
```

### map(inner, f)

Use this to transform matches. `f` should be a function which accepts a match as input and returns the transformed match.

If `inner` is a string, it is promoted to a `fixed` matcher. If it is a `RegExp` object, it is promoted to a `regex` matcher.

```js
const { star, map } = require('green-parse')

const xxMatcher = map(
  star('xx'),
  ([open, xxs, close]) => xxs.length
)

for (const value of xMatcher.match('xxxxxxx', 1)) {
  // this loop body is executed four times with the following `value`s:
  // { j: 1, value: 0 }
  // { j: 3, value: 1 }
  // { j: 5, value: 2 }
  // { j: 7, value: 3 }
}
```

### filter(inner, f)

Use this to only return certain matches. `f` should be a function which accepts a match as input and returns a `Boolean` indicating whether to keep it or not.

```js
const { filter, star, UNICODE } = require('green-parse')

const nonCMatcher = star(filter(UNICODE, match => match !== 'c'))

for (const value of nonCMatcher.match('abc', 0)) {
  // this loop body is executed three times with the following `value`s:
  // { j: 0, match: [] }
  // { j: 1, match: ['a'] }
  // { j: 2, match: ['a', 'b'] }
}
```

### resolve(open)

Use this to resolve multiple mutually recursive matchers together. `open` should be a function which has a single argument `ref` and returns an object whose values are matchers which use `ref` to refer to one another. The return value is a "grammar", an object whose values are matchers which are directly recursive. This is easiest to explain with an example:

```js
const { resolve, seq, or } = require('green-parse')

const matchers = resolve(ref => ({
  round: seq(['(', ref('term'), ')']),
  square: seq(['[', ref('term'), ']']),
  term: or([ref('round'), ref('square'), 'A'])
}))

for (const value of matchers.term.match('[(A)]', 0)) {
  // this loop body is executed once
  // `value` is { j: 7, match: ['[', ['(', 'A', ')'], ']'] }
}
```

This can be used to develop context-free grammars. This is a recursive descent parser, which means left-recursion is unsupported.

The values in the object returned by `open` should all be matchers. If they are strings, they are promoted to `fixed` matchers. If they are regular expressions, they are promoted to `regex` matchers.

### Matcher object methods

`EMPTY`, `CHR` and `UNICODE` are all matcher objects, and all the methods above return matcher objects. Every matcher object provides the following methods:

#### match(string, i)

Takes `string` and an integer index `i` from 0 to `string.length` inclusive. Yields values of the form `{ j, match }` where `j` is the index in the string where matching stopped and `match` can be any value, including `undefined`, depending on how this matcher was constructed.

```js
const { plus, CHR } = require('green-parse')

const polyMatcher = plus(plus(CHR))

for (const value of polyMatcher.match('abc', 0)) {
  // this loop body is executed seven times, with the following `value`s:
  // { j: 1, match: [['a']] }
  // { j: 2, match: [['a'], ['b']] }
  // { j: 3, match: [['a'], ['b'], ['c']] }
  // { j: 3, match: [['a'], ['b', 'c']] }
  // { j: 2, match: [['a', 'b']] }
  // { j: 3, match: [['a', 'b'], ['c']] }
  // { j: 3, match: [['a', 'b', 'c']] }
}
```

#### parse(string)

Same as `match(string, i)`, except:

* `i` is 0
* the values yielded are *only* those where the entire string was consumed (*i.e.* `j` is `string.length`)
* the values yielded are the matches alone, and do not include `j`.

```js
const { plus, CHR } = require('green-parse')

const polyMatcher = plus(plus(CHR))

for (const value of polyMatcher.parse('abc')) {
  // this loop body is executed four times, with the following `value`s:
  // [['a'], ['b'], ['c']]
  // [['a'], ['b', 'c']]
  // [['a', 'b'], ['c']]
  // [['a', 'b', 'c']]
}
```

#### parse1(string)

**Returns** (does not yield) the first full parse. If no full parses are found, throws an exception. The second and later parses, if they exist, are ignored (in fact, never generated).

```js
const { plus, CHR } = require('green-parse')

const polyMatcher = plus(plus(CHR))

const value = polyMatcher.parse1('abc')
// `value` is [['a'], ['b'], ['c']]
```

#### or(other)

```js
const aorb = fixed('a').or(fixed('b'))
```

#### maybe()

```js
const amaybe = fixed('a').maybe()
```

#### seq(other)

```js
const abc = fixed('a').seq(fixed('b')).seq(fixed('c'))
```

#### times(min, max[, separator])

```js
const twoOrThreeAs = fixed('a').times(2, 3)
```

#### star([separator])

```js
const unicodeStrMatcher = UNICODE.star()
```

#### plus([separator])

```js
const matchBinary = or(['0', '1']).plus()
```

#### filter(f)

```js
const anythingButVowels = UNICODE.filter(chr => !'aeiou'.includes(chr))
```

#### map(f)

```js
const zombifyMatcher = UNICODE.map(chr => 'aeiou'.includes(chr) ? 'r': chr)
```
