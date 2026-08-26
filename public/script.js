const colors = ['#f6b26b','#9fc5e8','#b6d7a8','#d9a1e3','#f4cccc']
const mediaFiles = ['media/surptees.png','media/blanksurptees.png']

const priceEl = document.getElementById('price')
const priceSelect = document.getElementById('priceSelect')
const teeImg = document.getElementById('teeImg')
const checkoutBtn = document.getElementById('checkoutBtn')
const stripeCheckout = document.getElementById('stripeCheckout')

let current = {price:null,color:colors[0],image:mediaFiles[0]}

function setTee(price,color,image){
  current = {price,color,image}
  priceEl.textContent = price
  if(teeImg && image) teeImg.src = image
}

function pickRandomColor(){
  return colors[Math.floor(Math.random()*colors.length)]
}

checkoutBtn.addEventListener('click', ()=>{
  startCheckout('4')
})

// Keep the shirt image a surprise for every one-off purchase.
teeImg.src = mediaFiles[Math.floor(Math.random()*mediaFiles.length)]

async function startCheckout(tier){
  checkoutBtn.disabled = true
  checkoutBtn.textContent = 'Opening secure checkout...'
  stripeCheckout.hidden = false

  try{
    const response = await fetch('/api/create-checkout-session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tier})
    })
    const result = await response.json()
    if(!response.ok || !result.url) throw new Error(result.error || 'Checkout could not be started.')
    window.location.assign(result.url)
  }catch(error){
    stripeCheckout.hidden = true
    checkoutBtn.disabled = false
    checkoutBtn.textContent = 'Show Checkout'
    alert(error.message)
  }
}
