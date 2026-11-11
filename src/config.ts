/** Fill these in at launch. */
export const STAMP = {
  ca: 'FyHoVLRdnRawp5kPckJTMRwPqjCmSXx7px39R5yRw5Ac',
  x: 'https://x.com/',
}

export const buyUrl = () =>
  STAMP.ca ? `https://raydium.io/launchpad/token/?mint=${STAMP.ca}` : 'https://raydium.io/launchpad/'

/** Clickable examples under the search field (real TAOLF data, 7–10 Nov 2026). */
export const EXAMPLES = [
  { verdict: 'STAMPED', label: 'Original', ticker: 'TAOLF', mint: '8CSWJWMqF74HgNXvwvhZWEbXC9A6HAbAnB2rjSEVPW8R' },
  { verdict: 'COPY', label: 'Copy', ticker: 'TAOLF', mint: '6xrSC21vLgvzZzRqmFJVQ6F4iWtHp8i9TL9sCj6wJV4G' },
  { verdict: 'LOOKALIKE', label: 'Look-alike', ticker: 'TAOLF', mint: '7FDPTaiReJL2Yqcyt9dAjSgyQWZFZKJ4KHpt641iLoat' },
] as const
