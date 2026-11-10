/**
 * Known LaunchLab pads. `configs` are the on-chain platform config addresses
 * we have tied to the pad (the coin's platformInfo.pubKey). A coin launched
 * through one of them carries that pad's stamp. A pad with no configs on
 * record yet is trusted by its registered domain alone.
 */
export interface Pad {
  id: string
  name: string
  domain: string
  img?: string
  x?: string
  configs: string[]
}

export const PADS: Pad[] = [
  {
    id: 'float',
    name: 'Float',
    domain: 'floatlaunch.xyz',
    img: 'https://www.floatlaunch.xyz/icon.png',
    x: 'floatdotxyz',
    configs: [
      '2TDPJJPV6nvTEqXABxrqno6Uzpipxxvh1zjLN3SMYn69',
      '7paQR4MLZcGdG8ZYAyj9Qu2UsJgXmNVQGha7g1gim1sG',
      'CKpEUk5SRk8CUNhhxaVPKtzKUKLgQe2tQHPH2eXWtaGR',
      '8qiizfdg7zd63EK9ajiSHeFgKhuQzx57DudwZZkpVp1H',
      '4jfL33VzxZ7chyzNAu3V3Qzu4fFvgdx2BedAugpDumro',
    ],
  },
  {
    id: 'volt',
    name: 'VOLT',
    domain: 'voltterminal.xyz',
    img: 'https://voltterminal.xyz/logo-mark.svg',
    configs: ['9Dvzu1d9RxLrMmUamwXJKAywi2MTG9GG9sfTKxb17cqW'],
  },
  {
    id: 'stonkfun',
    name: 'StonkFun',
    domain: 'stonkfun.xyz',
    img: 'https://www.stonkfun.xyz/stonkfun-logo.png',
    configs: [
      '4E876qZTE9FJMrBzgVtBrSrzz2TLivB5Y5QXPjB4gZL7',
      '6BwHHDg3u1854jC8PDLXvR4spTcLNaoBxLJNGC4nTESt',
    ],
  },
  {
    id: 'raydium',
    name: 'Raydium',
    domain: 'raydium.io',
    img: 'https://img-v1.raydium.io/share/launch_icon.png',
    x: 'raydiumprotocol',
    configs: ['4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4'],
  },
  {
    id: 'letsbonk',
    name: 'letsbonk.fun',
    domain: 'letsbonk.fun',
    img: 'https://sapphire-working-koi-276.mypinata.cloud/ipfs/bafkreicgnuyebtmnyhmjbwd32t5w2hcwbtwqlrxsc5eedpgtjy7q4remfa',
    configs: [
      'FfYek5vEz23cMkWsdJwG2oa6EphsvXSHrGpdALN4g6W1',
      'BuM6KDpWiTcxvrpXywWFiw45R2RNH8WURdvqoTDV1BW4',
    ],
  },
  {
    id: 'launchfair',
    name: 'LaunchFair',
    domain: 'launchfair.fun',
    img: 'https://launchfair.fun/apple-touch-icon.png',
    configs: ['9XAUrFFtYRqVNR5USHSyCREQ4DgMacHMMFXbYgBpuJba'],
  },
  {
    id: 'higher',
    name: 'higher.fun',
    domain: 'higher.fun',
    configs: [
      '6ngXxsSPUxp9YEX2QBXQP1DEdNud12tobUmnJVN74D5v',
      '7mT6fb3m6W2886ymKsShBBcnX3TYb9ZsnkDJtACsVt8V',
    ],
  },
  {
    id: 'sapling',
    name: 'Sapling',
    domain: 'sapling.cash',
    img: 'https://sapling.cash/icon.png',
    configs: ['71Q6nfxf1hTZcDpM15TMLgg72jsKg1tQcYva4za7PezJ'],
  },
  {
    id: 'padpad',
    name: 'PadPad',
    domain: 'padpad.trade',
    configs: [
      '3Xjmygp1L9sFoHXja3NKiqWgg2PLpXE1Wu8TnGQDfAoz',
      '4cw4XGjm1YAyPQqJmhZHo7tQJHWJhwBcU7xeeA9x3KqP',
      'Eb8ZqsDoQdPxpYVqDBWTtvA6J7tBctmumNou19EGHazW',
      '8qPfddGcgajJriG92SS5gFad56HpkMuieq7VcbfdYUiP',
    ],
  },
  {
    id: 'eve',
    name: 'eve',
    domain: 'useeve.xyz',
    img: 'https://useeve.xyz/icon-512.png',
    configs: ['4aM3goMSinodjzvK6NxZZEcTTgD8KEfgt3hM44vJuej4'],
  },
  {
    id: 'blessed',
    name: 'Blessed',
    domain: 'useblessed.app',
    img: 'https://useblessed.app/brand/preview.png',
    configs: ['HQLJ6gsArwHzHFN7msYjbvpAcnSbMnSPcFtN26DCeytY'],
  },
  {
    id: 'cook',
    name: 'Cook',
    domain: 'cooklaunchpad.fun',
    img: 'https://www.cooklaunchpad.fun/brand/cook-icon-512.png',
    configs: [
      '6JociF8fLWVf45siEGDq3fG9Rura7EojnF1CavpYaM4r',
      'B1mfw7FvNd1HKbAfvafiud893DwkLZCZkXPrxyqrzz9G',
      '8DDZ3N8hcdhjwShJZb78D8rKWKSgEnMCTx6EgW6VeQzz',
    ],
  },
  { id: 'peak', name: 'Peak', domain: 'launchonpeak.fun', configs: [] },
  { id: 'curvd', name: 'Curvd', domain: 'curvd.fun', configs: [] },
  { id: 'stoke', name: 'Stoke', domain: 'usestoke.xyz', configs: [] },
]

export const padByConfig = (pubKey: string) => PADS.find((p) => p.configs.includes(pubKey))

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
export const padByName = (name: string) =>
  name.trim() ? PADS.find((p) => norm(p.name) === norm(name)) : undefined
export const padByDomain = (domain: string | null) =>
  domain ? PADS.find((p) => p.domain === domain) : undefined
