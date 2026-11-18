/** Unit suites cannot reach the official model listing unless they answer `fetch` themselves. */
import { createServer } from 'node:http'
import { afterEach, expect, it } from 'vitest'
import type { Server } from 'node:http'
import { PUBLIC_BASE_URL } from '@deepseek-ai/dsh-llm-deepseek'
import { OFFICIAL_LISTING } from './test-official-listing-guard.ts'

const servers: Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve))))
})

it('guards the listing of the shipped official endpoint', () => {
  expect(OFFICIAL_LISTING).toBe(new URL('/models', PUBLIC_BASE_URL).href)
})

it.each([
  ['string', () => fetch(OFFICIAL_LISTING)],
  ['URL', () => fetch(new URL(OFFICIAL_LISTING))],
  ['Request', () => fetch(new Request(OFFICIAL_LISTING, { headers: { 'x-api-key': 'fixture-key' } }))],
])('rejects the official model listing given as a %s', async (_kind, request) => {
  await expect(request()).rejects.toThrow(`unit suites do not reach ${OFFICIAL_LISTING}; answer it with a fetch stub`)
})

it('passes every other request to the ambient fetch', async () => {
  const server = createServer((_request, response) => { response.end('local') })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  await expect((await fetch(`http://127.0.0.1:${address.port}/models`)).text()).resolves.toBe('local')
})
