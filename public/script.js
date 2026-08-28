const mediaFiles = ['media/surptees.png','media/blanksurptees.png']
const unitPrice = 4
const maxQuantity = 10

const teeImg = document.getElementById('teeImg')
const quantitySelect = document.getElementById('quantitySelect')
const orderSummary = document.getElementById('orderSummary')
const checkoutBtn = document.getElementById('checkoutBtn')
const stripeCheckout = document.getElementById('stripeCheckout')

function selectedQuantity(){
  const quantity = Number(quantitySelect.value)
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity ? quantity : null
}

checkoutBtn.addEventListener('click', ()=>{
  const quantity = selectedQuantity()
  if(!quantity){
    quantitySelect.focus()
    return
  }
  startCheckout('4',quantity)
})

quantitySelect.addEventListener('change', updateQuantityState)

// Keep the shirt image a surprise for every one-off purchase.
teeImg.src = mediaFiles[Math.floor(Math.random()*mediaFiles.length)]

function updateQuantityState(){
  const quantity = selectedQuantity()
  checkoutBtn.disabled = !quantity
  checkoutBtn.setAttribute('aria-disabled',String(!quantity))
  checkoutBtn.textContent = quantity ? 'Continue to Checkout' : 'Choose Quantity'
  orderSummary.textContent = quantity
    ? `${quantity} ${quantity === 1 ? 'tee' : 'tees'} × $${unitPrice} = $${quantity * unitPrice}`
    : 'Choose a quantity to see your total.'
}

async function startCheckout(tier,quantity){
  checkoutBtn.disabled = true
  checkoutBtn.textContent = 'Opening secure checkout...'
  stripeCheckout.hidden = false

  try{
    const response = await fetch('/api/create-checkout-session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tier,quantity})
    })
    const result = await response.json()
    if(!response.ok || !result.url) throw new Error(result.error || 'Checkout could not be started.')
    window.location.assign(result.url)
  }catch(error){
    stripeCheckout.hidden = true
    updateQuantityState()
    alert(error.message)
  }
}

updateQuantityState()
