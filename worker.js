export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if(url.pathname === '/api/create-checkout-session'){
      if(request.method !== 'POST'){
        return json({error:'Method not allowed.'},405,{Allow:'POST'})
      }

      return createCheckoutSession(request, env, url)
    }

    return new Response('Not Found',{status:404})
  }
}

async function createCheckoutSession(request, env, url){
  let body
  try{
    body = await request.json()
  }catch{
    return json({error:'Invalid request body.'},400)
  }

  const tier = String(body?.tier || '4')
  const priceId = tier === '4' ? 'price_1U8pC9AYfbMrS1E4BhPugS52' : null
  if(!priceId){
    return json({error:'Choose a valid price tier.'},400)
  }
  if(!env.STRIPE_SECRET_KEY){
    return json({error:'Stripe is not configured on this deployment.'},500)
  }

  const params = new URLSearchParams()
  params.set('mode','payment')
  params.set('line_items[0][price]',priceId)
  params.set('line_items[0][quantity]','1')
  params.set('metadata[tier]',tier)
  params.set('success_url',`${url.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url',`${url.origin}/?checkout=cancelled`)
  params.set('integration_identifier',`surptees_${randomLetters(8)}`)

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions',{
    method:'POST',
    headers:{
      Authorization:`Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:params
  })
  const result = await stripeResponse.json()
  if(!stripeResponse.ok){
    console.error('Stripe Checkout session error:',result?.error?.message || 'Unknown error')
    return json({error:'Unable to start checkout.'},502)
  }
  return json({url:result.url})
}

function json(body,status=200,headers={}){
  return new Response(JSON.stringify(body),{
    status,
    headers:{'Content-Type':'application/json',...headers}
  })
}

function randomLetters(length){
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  return Array.from({length},() => letters[Math.floor(Math.random()*letters.length)]).join('')
}
