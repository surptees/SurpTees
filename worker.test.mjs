import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import worker from './worker.js'

const quiet = async (fn) => {
  const original = console.error
  console.error = () => {}
  try {
    return await fn()
  } finally {
    console.error = original
  }
}

const withFetch = async (mock, fn) => {
  const original = globalThis.fetch
  globalThis.fetch = mock
  try {
    return await fn()
  } finally {
    globalThis.fetch = original
  }
}

const request = (path, init = {}) =>
  new Request(`https://surptees.com${path}`, init)

const post = (rawBody) =>
  request('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody
  })

const validPost = (body = { tier: 4, quantity: 2 }) =>
  post(JSON.stringify(body))

const testEnv = { STRIPE_SECRET_KEY: 'sk_test_mock_only' }

test('Wrangler declares the static binding used by the Worker and preserves the Worker name', () => {
  const config = JSON.parse(readFileSync(new URL('./wrangler.jsonc', import.meta.url), 'utf8'))
  assert.equal(config.assets.binding, 'ASSETS')
  assert.equal(config.name, 'surptees-checkout-api')
  assert.equal(config.main, 'worker.js')
})

test('asset responses pass through unchanged', async () => {
  const req = request('/index.html')
  const assetResponse = new Response('asset body', { status: 200, headers: { 'x-asset': 'yes' } })
  let seenRequest
  const response = await worker.fetch(req, {
    ASSETS: {
      fetch: async (requestValue) => {
        seenRequest = requestValue
        return assetResponse
      }
    }
  })
  assert.strictEqual(seenRequest, req)
  assert.strictEqual(response, assetResponse)
})

test('genuine missing asset responses remain 404s', async () => {
  for (const path of ['/robots.txt', '/wp-admin/install.php']) {
    const response = await worker.fetch(request(path), {
      ASSETS: { fetch: async () => new Response('Not Found', { status: 404 }) }
    })
    assert.equal(response.status, 404, path)
    assert.equal(await response.text(), 'Not Found', path)
  }
})

test('missing ASSETS binding reports a server error, not a 404', async () => {
  const response = await quiet(() => worker.fetch(request('/robots.txt'), {}))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'Service temporarily unavailable.' })
})

test('a thrown asset fetch reports a server error, not a 404', async () => {
  const response = await quiet(() =>
    worker.fetch(request('/robots.txt'), {
      ASSETS: { fetch: async () => { throw new Error('synthetic asset failure') } }
    })
  )
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'Service temporarily unavailable.' })
})

test('invalid checkout JSON returns 400 without contacting Stripe', async () => {
  let calls = 0
  await withFetch(async () => { calls++; throw new Error('Stripe must not be called') }, async () => {
    const response = await quiet(() => worker.fetch(post('{'), testEnv))
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: 'Invalid request body.' })
  })
  assert.equal(calls, 0)
})

test('invalid tier or quantity and missing Stripe key do not create a session', async () => {
  let calls = 0
  await withFetch(async () => { calls++; throw new Error('Stripe must not be called') }, async () => {
    const invalidTier = await worker.fetch(validPost({ tier: 5, quantity: 2 }), testEnv)
    assert.equal(invalidTier.status, 400)
    const invalidQuantity = await worker.fetch(validPost({ tier: 4, quantity: 11 }), testEnv)
    assert.equal(invalidQuantity.status, 400)
    const missingKey = await worker.fetch(validPost(), {})
    assert.equal(missingKey.status, 500)
  })
  assert.equal(calls, 0)
})

test('Stripe network failures return a generic 502', async () => {
  await withFetch(async () => { throw new Error('synthetic offline') }, async () => {
    const response = await quiet(() => worker.fetch(validPost(), testEnv))
    assert.equal(response.status, 502)
    const body = await response.json()
    assert.deepEqual(body, { error: 'Unable to start checkout.' })
  })
})

test('invalid Stripe JSON returns a generic 502', async () => {
  await withFetch(async () => new Response('not-json', { status: 200 }), async () => {
    const response = await quiet(() => worker.fetch(validPost(), testEnv))
    assert.equal(response.status, 502)
    assert.deepEqual(await response.json(), { error: 'Unable to start checkout.' })
  })
})

test('Stripe error responses return a generic 502 without exposing details', async () => {
  await withFetch(async () =>
    new Response(JSON.stringify({ error: { message: 'synthetic card data' } }), { status: 400 }), async () => {
    const response = await quiet(() => worker.fetch(validPost(), testEnv))
    assert.equal(response.status, 502)
    const text = await response.text()
    assert.ok(!text.includes('synthetic card data'))
    assert.deepEqual(JSON.parse(text), { error: 'Unable to start checkout.' })
  })
})

test('a successful Stripe response without a Checkout URL returns 502', async () => {
  await withFetch(async () =>
    new Response(JSON.stringify({ id: 'cs_test_mock_only' }), { status: 200 }), async () => {
    const response = await quiet(() => worker.fetch(validPost(), testEnv))
    assert.equal(response.status, 502)
    assert.deepEqual(await response.json(), { error: 'Unable to start checkout.' })
  })
})


test('homepage and customer guidance show pickup before checkout and remove shipping promises', () => {
  const homepage = readFileSync(new URL('./public/index.html', import.meta.url), 'utf8')
  const pickupPosition = homepage.indexOf('The Smoke Shop, 638 Walton Avenue, Bronx, NY')
  const checkoutPosition = homepage.indexOf('id="checkoutBtn"')
  assert.ok(pickupPosition >= 0 && pickupPosition < checkoutPosition)
  assert.ok(homepage.includes('Shipping coming soon.'))
  assert.ok(homepage.includes('Maximum 10 tees per checkout'))
  assert.ok(homepage.includes('$4 <span>each</span>'))

  for (const file of ['faqs.html', 'shipping-info.html', 'shipping-returns.html', 'surptees-help.html']) {
    const content = readFileSync(new URL(`./public/${file}`, import.meta.url), 'utf8')
    assert.ok(content.includes('The Smoke Shop, 638 Walton Avenue, Bronx, NY'), file)
    assert.ok(content.includes('Shipping coming soon.'), file)
    assert.doesNotMatch(content, /typically ship within|tracking is emailed|shipping rates and estimated arrival|shipping charges and delivery estimates/, file)
  }

  const help = readFileSync(new URL('./public/help-center.html', import.meta.url), 'utf8')
  assert.match(help, /pickup location before continuing to secure Stripe Checkout/)
  const returns = readFileSync(new URL('./public/returns-exchanges.html', import.meta.url), 'utf8')
  assert.ok(!returns.includes('package arrives damaged'))
  assert.ok(returns.includes('issue with your pickup order'))
  const about = readFileSync(new URL('./public/about-us.html', import.meta.url), 'utf8')
  assert.ok(about.includes('unknown until you pick up your order'))
})

test('alternate Express checkout keeps pickup guidance and does not configure shipping', () => {
  const server = readFileSync(new URL('./server.js', import.meta.url), 'utf8')
  assert.ok(server.includes("custom_text: { submit: { message: 'In-store pickup at The Smoke Shop, 638 Walton Avenue, Bronx, NY. Shipping coming soon.' } }"))
  assert.doesNotMatch(server, /shipping_address_collection|shipping_options/)
})

test('successful mocked checkout preserves product, quantity, and redirect behavior', async () => {
  let stripeRequest
  const secret = 'sk_test_mock_only'
  await withFetch(async (input, init) => {
    stripeRequest = { input: String(input), init }
    return new Response(JSON.stringify({
      id: 'cs_test_mock_only',
      url: 'https://checkout.stripe.com/c/pay/cs_test_mock_only'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }, async () => {
    const response = await worker.fetch(validPost({ tier: 4, quantity: 3 }), { STRIPE_SECRET_KEY: secret })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { url: 'https://checkout.stripe.com/c/pay/cs_test_mock_only' })
  })
  assert.equal(stripeRequest.input, 'https://api.stripe.com/v1/checkout/sessions')
  assert.equal(stripeRequest.init.method, 'POST')
  assert.equal(stripeRequest.init.headers.Authorization, `Basic ${btoa(`${secret}:`)}`)
  const params = new URLSearchParams(stripeRequest.init.body)
  assert.equal(params.get('mode'), 'payment')
  assert.equal(params.get('line_items[0][price]'), 'price_1U8pC9AYfbMrS1E4BhPugS52')
  assert.equal(params.get('line_items[0][quantity]'), '3')
  assert.equal(params.get('metadata[tier]'), '4')
  assert.equal(params.get('metadata[quantity]'), '3')
  assert.equal(params.get('custom_text[submit][message]'), 'In-store pickup at The Smoke Shop, 638 Walton Avenue, Bronx, NY. Shipping coming soon.')
  assert.equal(params.get('shipping_address_collection'), null)
  assert.equal(params.get('shipping_options[0][shipping_rate]'), null)
  assert.equal(params.get('success_url'), 'https://surptees.com/?checkout=success&session_id={CHECKOUT_SESSION_ID}')
  assert.equal(params.get('cancel_url'), 'https://surptees.com/?checkout=cancelled')
})
