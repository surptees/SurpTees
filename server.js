import 'dotenv/config'
import express from 'express'
import Stripe from 'stripe'

const app = express()
const port = Number(process.env.PORT || 4242)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const priceIds = {
  5: 'price_1U8TMJAYfbMrS1E4tuI3zAaQ',
  10: 'price_1U8TN7AYfbMrS1E4FAdp6Cjp',
  15: 'price_1U8TNlAYfbMrS1E4dPdBpY3j',
  20: 'price_1U8TOIAYfbMrS1E47HI6Jv7y'
}
const validSizes = new Set(['XS','S','M','L','XL','XXL','XXXL'])

app.use(express.json())
app.use(express.static('.'))

app.post('/api/create-checkout-session', async (request, response) => {
  const {tier, size} = request.body || {}
  const priceId = priceIds[tier]

  if(!priceId || !validSizes.has(size)){
    return response.status(400).json({error:'Choose a valid price tier and size.'})
  }

  try{
    const origin = request.headers.origin || `${request.protocol}://${request.get('host')}`
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{price:priceId, quantity:1}],
      metadata: {tier:String(tier), size},
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      integration_identifier: `surptees_${randomLetters(8)}`
    })

    return response.json({url:session.url})
  }catch(error){
    console.error('Stripe Checkout session error:', error.message)
    return response.status(500).json({error:'Unable to start checkout.'})
  }
})

app.listen(port, () => {
  console.log(`SurpTees running at http://localhost:${port}`)
})

function randomLetters(length){
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  return Array.from({length}, () => letters[Math.floor(Math.random() * letters.length)]).join('')
}