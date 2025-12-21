# CHANGELOG

## 4.0.0

Support for Node.js 18 and lower is dropped.

## 3.x.x

`green-parse` now uses ES modules exclusively, not CommonJS modules.

## 2.x.x

The behaviour of `resolve` has changed. Code like

```js
resolve({
  round: matchers => seq(['(', matchers.term, ')']),
  square: matchers => seq(['[', matchers.term, ']']),
  term: matchers => or([matchers.round, matchers.square, 'A'])
}))
```

should be refactored to:

```js
const matchers = resolve(ref => ({
  round: seq(['(', ref('term'), ')']),
  square: seq(['[', ref('term'), ']']),
  term: or([ref('round'), ref('square'), 'A'])
}))
```

## 1.x.x

No breaking changes, just felt it was time for a 1.0 release.

## 0.0.x

Prototype releases.
