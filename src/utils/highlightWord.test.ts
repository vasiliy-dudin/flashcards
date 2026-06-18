import { describe, expect, it } from 'vitest'
import { splitHighlight } from './highlightWord'

describe('splitHighlight', () => {
  it('splits the word out as a bold segment when found mid-sentence', () => {
    const result = splitHighlight('It was pure serendipity that we met.', 'serendipity')
    expect(result).toEqual([
      { text: 'It was pure ', bold: false },
      { text: 'serendipity', bold: true },
      { text: ' that we met.', bold: false },
    ])
  })

  it('matches case-insensitively but preserves the original casing in the output', () => {
    const result = splitHighlight('Serendipity struck again.', 'serendipity')
    expect(result).toEqual([
      { text: 'Serendipity', bold: true },
      { text: ' struck again.', bold: false },
    ])
  })

  it('matches a multi-word phrase (e.g. a phrasal verb)', () => {
    const result = splitHighlight('She decided to give up smoking.', 'give up')
    expect(result).toEqual([
      { text: 'She decided to ', bold: false },
      { text: 'give up', bold: true },
      { text: ' smoking.', bold: false },
    ])
  })

  it('returns the whole text unbolded when the word is not found (e.g. a different inflection)', () => {
    const result = splitHighlight('She is running late.', 'run')
    expect(result).toEqual([{ text: 'She is running late.', bold: false }])
  })

  it('does not match a partial substring inside another word', () => {
    const result = splitHighlight('This category is wrong.', 'cat')
    expect(result).toEqual([{ text: 'This category is wrong.', bold: false }])
  })

  it('returns the whole text unbolded when word is empty', () => {
    const result = splitHighlight('Some text.', '')
    expect(result).toEqual([{ text: 'Some text.', bold: false }])
  })

  it('highlights multiple occurrences of the word', () => {
    const result = splitHighlight('Cats and cats everywhere.', 'cats')
    expect(result).toEqual([
      { text: 'Cats', bold: true },
      { text: ' and ', bold: false },
      { text: 'cats', bold: true },
      { text: ' everywhere.', bold: false },
    ])
  })
})
