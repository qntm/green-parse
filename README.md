# green-parse

This is a small recursive descent parsing library which I built mainly for my own use.

## Installation

```bash
npm install green-parse
```

## Example

```js
const {fixed, or, seq} = require('green-parse')

const matchZero = fixed("0")
  .map(() => 0)

const matchNonZeroDigit = or("123456789".split("").map(fixed))
  .map(match => parseInt(match, 10))

const matchDigit = or("0123456789".split("").map(fixed))
  .map(match => parseInt(match, 10))

const matchPositiveInteger = seq([matchNonZeroDigit, matchDigit.star()])
  .map(([nonZeroDigit, digits]) => digits.reduce((acc, digit) => acc * 10 + digit, nonZeroDigit))

const iterator = matchPositiveInteger('923510', 2)
console.log(iterator.next()) // {value: {match: 3, j: 3}, done: false}
console.log(iterator.next()) // {value: {match: 35, j: 4}, done: false}
console.log(iterator.next()) // {value: {match: 351, j: 5}, done: false}
console.log(iterator.next()) // {value: {match: 3510, j: 6}, done: false}
console.log(iterator.next()) // {done: true}
```

## API

In JavaScript, an [*iterator*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators) is something conforming to the [iterator protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#The_iterator_protocol). This is fundamentally an object with a single function property, `next`, which can be called repeatedly, at first returning objects of the form `{value, done: false}`, and eventually (possibly) returning `{done: true}` forever.

```js
const arr = ['a', 'b', 'c']

let i = 0
const iterator = {
  next: () =>
    i < array.length ? {value: array[i++], done: false} : {done: true}
}

console.log(iterator.next()) // {value: 'a', done: false}
console.log(iterator.next()) // {value: 'b', done: false}
console.log(iterator.next()) // {value: 'c', done: false}
console.log(iterator.next()) // {done: true}
console.log(iterator.next()) // {done: true}
```

An *iterator factory* is just a function which returns iterators.

```js
const makeIterator = array => {
  let i = 0
  return {
    next: () =>
      i < array.length ? {value: array[i++], done: false} : {done: true}
  }
}

const iterator = makeIterator(['a', 'b', 'c'])
// etc.
```

Let's call a *matcher* (with a small M) an iterator factory which

1. accepts two parameters: a string and an integer index, and
2. returns iterators whose `value`s are *matches*: objects of the form `{match, j}`, where `match` is any object and `j` is the index in the string where matching stopped.

```js
const matcher = (string, i) => {
  let done = false
  return {
    next: () => {
      if (!done && i < string.length) {
        done = true
        return {
          value: {
            match: string.substr(i, 1),
            j: i + 1
          },
          done: false
        }
      } else {
        return {done: true}
      }
    }
  }
})

const iterator = matcher('abc', 1)
console.log(iterator.next()) // {value: {match: 'b', j: 2}, done: false}
console.log(iterator.next()) // {done: true}
```

Having said that, `greenParse` exposes the following:

### chr

A fixed matcher object which matches any single character from a string. Note that a JavaScript `String` object is a sequence of 16-bit code units, with Unicode characters outside the Basic Multilingual Plane encoded as a *surrogate pair* of code units. In this case, this matcher returns just a single surrogate.

```js
const iterator = chr('abc', 0)
console.log(iterator.next()) // {value: {match: 'a', j: 1}, done: false}
console.log(iterator.next()) // {done: true}
```

### unicode

A fixed matcher which matches any single Unicode character from a string. In the case of characters outside the Basic Multilingual Plane, this will be a `String` of `length` `2`, not `1`. If surrogates in the string are not paired correctly, this matcher will return no matches.

### fixed(str)

Returns a matcher which matches a fixed substring in the input.

```js
const matchB = fixed('b')

const iterator = matchB('abc', 1)
console.log(iterator.next()) // {value: {match: 'b', j: 2}, done: false}
console.log(iterator.next()) // {done: true}
```

### or(matchers)

Takes an array `matchers` and returns a new matcher which systematically returns all of the results from each inner matcher in turn.

```js
const aorb = or([fixed('a'), fixed('b')])

const iterator = aorb('a', 0)
console.log(iterator.next()) // {value: {match: 'a', j: 1}, done: false}
console.log(iterator.next()) // {done: true}

const iterator2 = aorb('b', 0)
console.log(iterator2.next()) // {value: {match: 'b', j: 1}, done: false}
console.log(iterator2.next()) // {done: true}
```

### seq(matchers)

Takes an array `matchers` and returns a new matcher which applies all of the inner matches in sequence. Each match returned by `seq` is an array of the matches from each inner matcher. Proceeds depth-first.

```js
const abc = seq([fixed('a'), fixed('b'), fixed('c')])

const iterator = abc('abc', 0)
console.log(iterator.next()) // {value: {match: ['a', 'b', 'c'], j: 3}, done: false}
console.log(iterator.next()) // {done: true}
```

### star(matcher)

Match zero or more of `matcher` in a row. Proceeds depth-first. Results are arrays of inner matches.

```js
const astar = star(fixed('a'))

const iterator = astar('aaa', 0)
console.log(iterator.next()) // {value: {match: [], j: 0}, done: false}
console.log(iterator.next()) // {value: {match: ['a'], j: 1}, done: false}
console.log(iterator.next()) // {value: {match: ['a', 'a'], j: 2}, done: false}
console.log(iterator.next()) // {value: {match: ['a', 'a', 'a'], j: 3}, done: false}
console.log(iterator.next()) // {done: true}
```

### resolve(unresolveds)

Resolves multiple "unresolved" matchers together. Easiest to explain with an example:

```js
const grammar = resolve({
  round: matchers =>
    seq([fixed('('), matchers.term, fixed(')')]),
  square: matchers =>
    seq([fixed('['), matchers.term, fixed(']')]),
  term: matchers =>
    or([matchers.round, matchers.square, fixed('A')])
})

const iterator = grammar.term('[(A)]', 0)
console.log(iterator.next()) // {value: {match: ['[', ['(', 'A', ')'], ']'], j: 7}, done: false}
```

This can be used to develop context-free grammars. This is a recursive descent parser, which means left-recursion is unsupported.

### plus(matcher)

Like `star`, but matches one or more rather than zero or more.

### wseq(matchers, separator)

Match a sequence of things, separated by some separator. Doesn't allow anything before or after. The sequence has to have at least one entry. Separator matches are omitted from the result.

```js
const letters = wseq([fixed('a'), fixed('b'), fixed('c')], star(fixed(' ')))

const iterator = letters('a  b    c', 0)
console.log(iterator.next()) // {value: {match: ['a', 'b', 'c'], j: 9}, done: false}
```

### wplus(matcher, separator)

Matches one or more of `matcher` separated by `separator`. Separator matches are omitted from the result.

```js
const xs = wplus(fixed('x'), fixed('|'))

const iterator = xs('x|x|x', 0)
console.log(iterator.next()) // {value: {match: ['x'], j: 1}, done: false}
console.log(iterator.next()) // {value: {match: ['x', 'x'], j: 3}, done: false}
console.log(iterator.next()) // {value: {match: ['x', 'x', 'x'], j: 5}, done: false}
console.log(iterator.next()) // {done: true}
```

### Matcher(matcher)

Wraps up a small-M matcher object into a big-M `Matcher` object with the same behaviour but a variety of useful methods. Note that all of the methods supplied above return `Matcher` objects which means they all have these methods on them.

#### map(f)

Use this to transform matches. `f` should be a function which accepts a match as input and returns the transformed match.

```js
const bracketed = seq(fixed('('), star(fixed('x')), fixed(')'))
  .map(([open, xs, close]) => xs.length)

const iterator = bracketed('(xxxx)', 0)
console.log(iterator.next()) // {value: {match: 4, j: 6}, done: false}
```

#### filter(f)

Use this to only return certain matches. `f` should be a function which accepts a match as input and returns a `Boolean` indicating whether to keep it or not.

```js
const matchAnythingButC = unicode.filter(match => match !== 'c').star()

const iterator = matchAnythingButC('abc', 0)
expect(iterator.next()).toEqual({value: {match: [], j: 0}, done: false})
expect(iterator.next()).toEqual({value: {match: ['a'], j: 1}, done: false})
expect(iterator.next()).toEqual({value: {match: ['a', 'b'], j: 2}, done: false})
expect(iterator.next()).toEqual({done: true})
```

#### star()

```js
const matchUnicodeString = unicode.star()
```

#### plus()

```js
const matchBinary = or([fixed('0'), fixed('1')]).plus()
```

#### or(other)

```js
const aorb = fixed('a').or(fixed('b'))
```

#### seq(other)

```js
const abc = fixed('a').seq(fixed('b')).seq(fixed('c'))
```

#### wplus(separator)

```js
const aaa = fixed('a').wplus(fixed('-'))
```

### Parser(matcher)

Wraps up a small-M matcher object into a `Parser` object. Whereas a matcher accepts two arguments, a string and an index in the string, a parser accepts only a string; the index is implicitly `0`. Similarly, where the values returned by a matcher are of the form `{match, j}`, the parser returns just matches by themselves; `j` is implicitly the length of the string. In other words, complete parse trees only.

```js
const astar = Parser(star(fixed('a')))

const iterator = astar('aaa')
console.log(iterator.next()) // {value: ['a', 'a', 'a'], done: false}
console.log(iterator.next()) // {done: true}
```
