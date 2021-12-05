// Simple match generators
// It is assumed that `i` is from 0 to `string.length` inclusive.
// Functions operating on existing simple match generator functions are all
// capable of promoting a single string to a simple match generator function.

const NOTHING = function * (string, i) {}

const CHR = function * (string, i) {
  if (i < string.length) {
    yield {
      j: i + 1,
      match: string.substr(i, 1)
    }
  }
}

const UNICODE = function * (string, i) {
  if (i < string.length) {
    const first = string.charAt(i)
    if (first >= '\uD800' && first <= '\uDBFF') {
      if (i + 1 < string.length) {
        const second = string.charAt(i + 1)
        if (second >= '\uDC00' && second <= '\uDFFF') {
          yield {
            j: i + 1 + 1,
            match: first + second
          }
        } // else bad UTF-16
      }
    } else {
      // BMP
      yield {
        j: i + 1,
        match: first
      }
    }
  }
}

const fixed = needle => function * (string, i) {
  if (string.substr(i, needle.length) === needle) {
    yield {
      j: i + needle.length,
      match: needle
    }
  }
}

const EMPTY = fixed('')

const regex = regExp => {
  if (regExp.global) {
    throw Error('Can\'t use a global RegExp')
  }
  if (!regExp.source.startsWith('^')) {
    throw Error('RegExp must be anchored at the start of the substring')
  }
  return function * (string, i) {
    const result = string.substring(i).match(regExp)
    if (result !== null) {
      yield {
        j: i + result[0].length,
        match: [...result]
      }
    }
  }
}

// If `inner` is a string, promote it to a `fixed` simple match generator for
// that string. If it's a regular expression object, promote it to a `regex`.
const promote = inner => typeof inner === 'string'
  ? fixed(inner)
  : Object.prototype.toString.call(inner) === '[object RegExp]'
    ? regex(inner)
    : inner

/**
  Returns all the results from the first matcher and then all the results from
  the next matcher and so on
*/
const or = inners => {
  inners = inners.map(promote)
  return function * (string, i) {
    for (const inner of inners) {
      yield * inner(string, i)
    }
  }
}

const seq = (inners, separator = EMPTY) => {
  if (inners.length === 0) {
    return function * (string, i) {
      yield {
        j: i,
        match: []
      }
    }
  }

  separator = promote(separator)
  inners = inners.map(promote)
  inners = inners.map((inner, i) => i === 0
    ? inner
    : function * (string, i) {
      for (const separatorValue of separator(string, i)) {
        yield * inner(string, separatorValue.j)
      }
    }
  )

  return function * (string, i) {
    const inner = inners[0]
    const iterator = inner(string, i)
    const stack = [{ iterator }]
    while (stack.length - 1 in stack) {
      const frame = stack[stack.length - 1]
      const next = frame.iterator.next()

      if (next.done) {
        stack.pop()
      } else {
        frame.value = next.value

        if (stack.length === inners.length) {
          yield {
            j: frame.value.j,
            match: stack.map(frame => frame.value.match)
          }
        } else {
          // stack not full yet
          const inner = inners[stack.length]
          const iterator = inner(string, frame.value.j)
          stack.push({ iterator })
        }
      }
    }

    // stack is empty, we're done
  }
}

// `min` and `max` are inclusive
const times = (inner, min, max, separator = EMPTY) => {
  if (max === 0) {
    return function * (string, i) {
      yield {
        j: i,
        match: []
      }
    }
  }

  separator = promote(separator)
  inner = promote(inner)
  const firstInner = inner
  const nonFirstInner = function * (string, i) {
    for (const separatorValue of separator(string, i)) {
      yield * firstInner(string, separatorValue.j)
    }
  }

  return function * (string, i) {
    const stack = []
    while (true) {
      if (stack.length === 0) {
        const j = i

        if (min === 0) {
          yield {
            j: i,
            match: []
          }
        }

        const iterator = firstInner(string, i)
        stack.push({ iterator })

        while (true) {
          const { done, value } = stack[stack.length - 1].iterator.next()
          if (!done) {
            stack[stack.length - 1].value = value
            break
          }
          stack.pop()
          if (!(stack.length - 1 in stack)) {
            // stack is empty, we're done
            return
          }
        }
      } else {
        const j = stack.length === 0
          ? i
          : stack[stack.length - 1].value.j

        if (min <= stack.length && stack.length <= max) {
          yield {
            j,
            match: stack.map(frame => frame.value.match)
          }
        }

        if (stack.length < max) {
          const inner = stack.length === 0 ? firstInner : nonFirstInner
          const iterator = inner(string, j)
          stack.push({ iterator })
        }

        while (true) {
          if (!(stack.length - 1 in stack)) {
            // stack is empty, we're done
            return
          }
          const { done, value } = stack[stack.length - 1].iterator.next()
          if (!done) {
            stack[stack.length - 1].value = value
            break
          }
          stack.pop()
        }
      }
    }
  }
}

const star = (inner, separator) =>
  times(inner, 0, Infinity, separator)

const plus = (inner, separator) =>
  times(inner, 1, Infinity, separator)

const maybe = inner => {
  inner = promote(inner)
  return function * (string, i) {
    yield * EMPTY(string, i)
    yield * inner(string, i)
  }
}

// inners are values of the object returned from `ref`
const resolve = open => {
  const closed = Object.fromEntries(
    Object.entries(
      open(nonterminal =>
        (string, i) =>
          closed[nonterminal](string, i)
      )
    ).map(([nonterminal, inner]) =>
      [nonterminal, promote(inner)]
    )
  )
  return closed
}

const map = (inner, f) => {
  inner = promote(inner)
  return function * (string, i) {
    for (const value of inner(string, i)) {
      yield {
        j: value.j,
        match: f(value.match)
      }
    }
  }
}

const filter = (inner, f) => {
  inner = promote(inner)
  return function * (string, i) {
    for (const value of inner(string, i)) {
      if (f(value.match)) {
        yield value
      }
    }
  }
}

const parser = inner => {
  inner = promote(inner)
  return function * (string) {
    for (const value of inner(string, 0)) {
      if (value.j === string.length) {
        yield value.match
      }
    }
  }
}

const parse1 = inner => {
  inner = promote(inner)
  return string => {
    for (const value of inner(string, 0)) {
      if (value.j !== string.length) {
        continue
      }
      return value.match
    }
    throw Error('Expected 1 result, got 0')
  }
}

module.exports = {
  NOTHING,
  EMPTY,
  CHR,
  UNICODE,
  fixed,
  or,
  seq,
  times,
  star,
  plus,
  maybe,
  resolve,
  map,
  filter,
  regex,
  parser,
  parse1
}
