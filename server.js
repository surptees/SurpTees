import 'dotenv/config'
import express from 'express'
import Stripe from 'stripe'

const app = express()
const port = Number(process.env.PORT || 4242)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

app.use(express.json())
app.use(express.static('public'))

app.post('/api/create-checkout-session', async (request, response) => {
  const {tier} = request.body || {}
  const quantity = Number(request.body?.quantity)
  const priceId = tier === '4' ? 'price_1U8pC9AYfbMrS1E4BhPugS52' : null

  if(!priceId){
    return response.status(400).json({error:'Choose a valid price tier.'})
  }
  if(!Number.isInteger(quantity) || quantity < 1 || quantity > 10){
    return response.status(400).json({error:'Choose a quantity from 1 to 10.'})
  }

  try{
    const origin = request.headers.origin || `${request.protocol}://${request.get('host')}`
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{price:priceId, quantity}],
      metadata: {tier:String(tier), quantity:String(quantity)},
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
