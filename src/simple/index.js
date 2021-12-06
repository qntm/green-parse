// Simple match generators
// It is assumed that `i` is an integer from 0 to `string.length` inclusive.
// Functions operating on existing simple match generator functions are all
// capable of promoting a single string to a simple match generator function.

const NOTHING = function * (string, i) {}

const EMPTY = function * (string, i) {
  yield {
    j: i,
    match: ''
  }
}

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

const or = inners => function * (string, i) {
  for (const inner of inners) {
    yield * inner(string, i)
  }
}

const seq = (inners, separator) => {
  inners = inners.map((inner, i) => i === 0
    ? inner
    : function * (string, i) {
      for (const separatorValue of separator(string, i)) {
        yield * inner(string, separatorValue.j)
      }
    }
  )

  return function * (string, i) {
    const stack = []

    if (stack.length === inners.length) {
      yield {
        j: i,
        match: []
      }
    }

    if (stack.length < inners.length) {
      // stack not full yet
      const inner = inners[0]
      const iterator = inner(string, i)
      stack.push({ iterator })
    }

    while (stack.length - 1 in stack) {
      const frame = stack[stack.length - 1]
      const { done, value } = frame.iterator.next()

      if (done) {
        stack.pop()
      } else {
        frame.value = value

        if (stack.length === inners.length) {
          yield {
            j: frame.value.j,
            match: stack.map(frame => frame.value.match)
          }
        }

        if (stack.length < inners.length) {
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
const times = (inner, min, max, separator) => {
  const nonFirstInner = function * (string, i) {
    for (const separatorValue of separator(string, i)) {
      yield * inner(string, separatorValue.j)
    }
  }

  return function * (string, i) {
    const stack = []

    if (min <= stack.length && stack.length <= max) {
      yield {
        j: i,
        match: []
      }
    }

    if (stack.length < max) {
      // stack not full yet
      const iterator = inner(string, i)
      stack.push({ iterator })
    }

    while (stack.length - 1 in stack) {
      const frame = stack[stack.length - 1]
      const { done, value } = frame.iterator.next()

      if (done) {
        stack.pop()
      } else {
        frame.value = value

        if (min <= stack.length && stack.length <= max) {
          yield {
            j: frame.value.j,
            match: stack.map(frame => frame.value.match)
          }
        }

        if (stack.length < max) {
          // stack not full yet
          const iterator = nonFirstInner(string, frame.value.j)
          stack.push({ iterator })
        }
      }
    }

    // stack is empty, we're done
  }
}

// inners are values of the object returned from `ref`
const resolve = open => {
  const ref = nonterminal => (string, i) => closed[nonterminal](string, i)
  const closed = open(ref)
  return closed
}

const map = (inner, f) => function * (string, i) {
  for (const value of inner(string, i)) {
    yield {
      j: value.j,
      match: f(value.match)
    }
  }
}

const filter = (inner, f) => function * (string, i) {
  for (const value of inner(string, i)) {
    if (f(value.match)) {
      yield value
    }
  }
}

const parser = inner => function * (string) {
  for (const value of inner(string, 0)) {
    if (value.j === string.length) {
      yield value.match
    }
  }
}

const parse1 = inner => string => {
  for (const value of inner(string, 0)) {
    if (value.j !== string.length) {
      continue
    }
    return value.match
  }
  throw Error('Parsing failed')
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
  resolve,
  map,
  filter,
  regex,
  parser,
  parse1
}
