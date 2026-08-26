const colors = ['#f6b26b','#9fc5e8','#b6d7a8','#d9a1e3','#f4cccc']
const mediaFiles = ['media/surptees.png','media/blanksurptees.png']

const priceEl = document.getElementById('price')
const priceSelect = document.getElementById('priceSelect')
const teeImg = document.getElementById('teeImg')
const checkoutBtn = document.getElementById('checkoutBtn')
const sizeSelect = document.getElementById('size')
const stripeCheckout = document.getElementById('stripeCheckout')
const sizeCarousel = document.getElementById('sizeCarousel')
const sizeDots = document.getElementById('sizeDots')
const sizeValue = document.getElementById('sizeValue')

let current = {price:null,color:colors[0],image:mediaFiles[0]}
const carouselState = {
  size: {items:['XS','S','M','L','XL','XXL','XXXL'], index:0, selected:null, track:sizeCarousel, dots:sizeDots, input:sizeSelect, label:sizeValue}
}

function setTee(price,color,image){
  current = {price,color,image}
  priceEl.textContent = price
  if(teeImg && image) teeImg.src = image
}

function pickRandomColor(){
  return colors[Math.floor(Math.random()*colors.length)]
}

function renderCarousel(name){
  const state = carouselState[name]
  const visible = state.items.slice(state.index,state.index + 3)
  state.track.innerHTML = visible.map(item => `<button class="choice-card${state.selected === item ? ' is-selected' : ''}" type="button" aria-pressed="${state.selected === item}" data-choice="${item}">${name === 'price' ? '$' : ''}${item}</button>`).join('')
  state.track.querySelectorAll('[data-choice]').forEach(button => {
    button.addEventListener('click', () => selectCarousel(name, button.dataset.choice))
  })
  const totalDots = Math.max(1,state.items.length - 2)
  state.dots.textContent = Array.from({length:totalDots},(_,i) => i === state.index ? '●' : '○').join('')
}

function selectCarousel(name,value){
  const state = carouselState[name]
  state.selected = value
  state.input.value = value
  state.label.textContent = name === 'price' ? `$${value}` : value
  renderCarousel(name)
}

function moveCarousel(name,direction){
  const state = carouselState[name]
  const maxIndex = Math.max(0,state.items.length - 3)
  state.index = Math.min(maxIndex,Math.max(0,state.index + direction))
  renderCarousel(name)
}

checkoutBtn.addEventListener('click', ()=>{
  const size = sizeSelect.value
  if(!size){
    alert('Please choose a size before checking out.')
    return
  }
  startCheckout('4',size)
})

document.querySelectorAll('[data-carousel][data-direction]').forEach(button => {
  button.addEventListener('click', () => moveCarousel(button.dataset.carousel,parseInt(button.dataset.direction,10)))
})

// Keep the shirt image a surprise while requiring deliberate price and size choices.
teeImg.src = mediaFiles[Math.floor(Math.random()*mediaFiles.length)]
renderCarousel('size')

async function startCheckout(tier,size){
  checkoutBtn.disabled = true
  checkoutBtn.textContent = 'Opening secure checkout...'
  stripeCheckout.hidden = false

  try{
    const response = await fetch('/api/create-checkout-session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tier,size})
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
