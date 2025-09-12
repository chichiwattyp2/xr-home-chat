
(async function(){
  const scene = document.querySelector('a-scene');
  const grid = document.getElementById('mrGrid');
  const cartList = document.getElementById('mrCartList');
  const totalEl = document.getElementById('mrTotal');

  // Load the same catalog you use in 3D
  const items = await fetch('assets/catalog.json').then(r=>r.json());
  const cart = new Map(); // id -> {product, qty}

  const add = (p) => {
    const rec = cart.get(p.id) || { product: p, qty: 0 };
    rec.qty += 1; cart.set(p.id, rec); renderCart();
    // Mirror to 3D shop (so both stay in sync)
    scene.emit('shop:add', { product: p });
  };
  const remove = (p) => {
    if (!cart.has(p.id)) return;
    const rec = cart.get(p.id);
    rec.qty -= 1;
    if (rec.qty <= 0) cart.delete(p.id); else cart.set(p.id, rec);
    renderCart();
    scene.emit('shop:remove', { product: p });
  };

  function renderGrid(){
    grid.innerHTML = '';
    items.forEach(p=>{
      const card = document.createElement('article');
      card.className = 'mr-card';
      card.setAttribute('role','listitem');
      card.innerHTML = `
        <img class="mr-card_img" src="${p.image}" alt="${p.name}">
        <div class="mr-card_body">
          <div class="mr-card_name">${p.name}</div>
          <div class="mr-card_meta">
            <span class="mr-muted">${p.id}</span>
            <span class="mr-price">$${p.price.toFixed(2)}</span>
          </div>
          <button class="mr-add">Add to cart</button>
        </div>`;
      card.querySelector('.mr-add').onclick = ()=> add(p);
      grid.appendChild(card);
    });
  }

  function renderCart(){
    const arr = [...cart.values()];
    cartList.innerHTML = '';
    let total = 0;
    arr.forEach(({product, qty})=>{
      total += product.price * qty;
      const li = document.createElement('li');
      li.className = 'mr-cart-item';
      li.innerHTML = `
        <span>${product.name}</span>
        <div class="mr-qty">
          <button class="mr-step" aria-label="Decrease">−</button>
          <strong>${qty}</strong>
          <button class="mr-step" aria-label="Increase">+</button>
        </div>
        <button class="mr-step mr-remove" aria-label="Remove">✕</button>`;
      const [minus, plus] = li.querySelectorAll('.mr-step');
      minus.onclick = ()=> remove(product);
      plus.onclick  = ()=> add(product);
      li.querySelector('.mr-remove').onclick = ()=> { cart.delete(product.id); renderCart(); scene.emit('shop:remove',{product}); };
      cartList.appendChild(li);
    });
    totalEl.textContent = `$${total.toFixed(2)}`;
  }

  // Also listen for 3D clicks (if you keep the 3D grid visible)
  scene.addEventListener('shop:add', (e)=> {
    const p = e.detail?.product; if (!p) return;
    const cur = cart.get(p.id) || {product:p, qty:0};
    cur.qty += 1; cart.set(p.id, cur); renderCart();
  });

  renderGrid(); renderCart();

  // Voice shortcut (uses your existing components if present)
  const voiceBtn = document.getElementById('mrVoice');
  if (voiceBtn){
    voiceBtn.onclick = ()=> document.getElementById('assistant')?.components['speech-input']?.init?.();
  }
})();

