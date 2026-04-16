<script setup>
// 1. ESTADOS PRINCIPALES
const auth = ref({ logged: false, user: '', role: '' });
const loginData = ref({ user: '', pass: '' });

// Usamos pick para asegurar que traemos lo que necesitamos
const { data: db, refresh, pending } = await useFetch('/api/tienda');

// 2. LÓGICA DE ACCESO
const entrarAlSitio = () => {
  // Verificación de seguridad para Vercel
  if (pending.value || !db.value) {
    alert("Sincronizando con el servidor... intenta de nuevo.");
    return;
  }

  const listaUsuarios = db.value.usuarios || [];
  const u = listaUsuarios.find(x => 
    x.user === loginData.value.user && 
    x.pass === loginData.value.pass
  );

  if (u) {
    auth.value = { logged: true, user: u.user, role: u.role };
  } else {
    alert("Usuario o contraseña incorrectos");
  }
};

// 3. LÓGICA DEL CARRITO INTERACTIVO
const carrito = ref([]);
const mostrarTicket = ref(false);

const agregarAlCarrito = (juego) => {
  const item = carrito.value.find(c => c.id === juego.id);
  if (item) {
    item.cantidad++;
  } else {
    carrito.value.push({ ...juego, cantidad: 1 });
  }
};

const quitarDelCarrito = (id) => {
  const index = carrito.value.findIndex(c => c.id === id);
  if (index !== -1) {
    if (carrito.value[index].cantidad > 1) {
      carrito.value[index].cantidad--;
    } else {
      carrito.value.splice(index, 1);
    }
  }
};

const totalCarrito = computed(() => 
  carrito.value.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)
);

// 4. GENERAR TICKET
const finalizarCompra = async () => {
  const venta = {
    cliente: auth.value.user,
    total: totalCarrito.value,
    fecha: new Date().toLocaleString(),
    productos: carrito.value.map(c => ({ titulo: c.titulo, cant: c.cantidad }))
  };
  
  await $fetch('/api/tienda', { method: 'POST', body: { type: 'venta', data: venta } });
  mostrarTicket.value = true; // Activa el modal interactivo
};

const limpiarYSalir = () => {
  mostrarTicket.value = false;
  carrito.value = [];
};

// 5. FUNCIONES ADMIN
const cargarDesdeAPI = async () => {
  await $fetch('/api/tienda', { method: 'POST', body: { type: 'fetch-external' } });
  await refresh();
};

const eliminarJuego = async (id) => {
  await $fetch('/api/tienda', { method: 'DELETE', body: { id } });
  await refresh();
};
</script>

<template>
  <div class="app-shell">
    
    <div v-if="!auth.logged" class="login-screen">
      <div class="login-card">
        <div class="game-icon">🎮</div>
        <h1>GAME<span>SHOP</span></h1>
        <div class="inputs">
          <input v-model="loginData.user" type="text" placeholder="Usuario">
          <input v-model="loginData.pass" type="password" placeholder="Contraseña">
        </div>
        <button @click="entrarAlSitio" class="btn-login">ACCEDER AL SISTEMA</button>
      </div>
    </div>

    <div v-else class="site-layout">
      <header class="navbar">
        <div class="brand">GAMESHOP</div>
        <div class="user-pill">
          <span>{{ auth.user }} ({{ auth.role }})</span>
          <button @click="auth.logged = false" class="btn-logout">Salir</button>
        </div>
      </header>

      <div class="main-content">
        <aside class="sidebar">
          <div v-if="auth.role === 'user'" class="cart-box">
            <h3>🛒 Mi Carrito</h3>
            <div v-if="carrito.length === 0" class="empty-msg">No hay productos</div>
            
            <div v-for="c in carrito" :key="c.id" class="cart-item">
              <div class="item-info">
                <span class="item-name">{{ c.titulo }}</span>
                <span class="item-price">${{ c.precio * c.cantidad }}</span>
              </div>
              <div class="item-controls">
                <button @click="quitarDelCarrito(c.id)">-</button>
                <span>{{ c.cantidad }}</span>
                <button @click="agregarAlCarrito(c)">+</button>
              </div>
            </div>

            <div v-if="carrito.length > 0" class="cart-footer">
              <div class="total-line">
                <span>TOTAL:</span>
                <span>${{ totalCarrito }}</span>
              </div>
              <button @click="finalizarCompra" class="btn-checkout">Comprar ahora</button>
            </div>
          </div>

          <div v-if="auth.role === 'admin'" class="admin-box">
            <h3>Gestión TICS</h3>
            <button @click="cargarDesdeAPI" :disabled="pending" class="btn-api">
              {{ pending ? 'Cargando...' : '⚡ GENERAR DESDE API' }}
            </button>
          </div>
        </aside>

        <main class="catalog">
          <div class="catalog-header">
            <h2>Catálogo de Títulos</h2>
            <span>{{ db?.juegos?.length || 0 }} juegos disponibles</span>
          </div>

          <div class="games-grid">
            <div v-for="j in db?.juegos" :key="j.id" class="game-card">
              <img :src="j.imagen || 'https://via.placeholder.com/150'" alt="Portada">
              <h4>{{ j.titulo }}</h4>
              <p class="price">${{ j.precio }}</p>
              
              <button v-if="auth.role === 'user'" @click="agregarAlCarrito(j)" class="btn-add">
                + Carrito
              </button>
              <button v-if="auth.role === 'admin'" @click="eliminarJuego(j.id)" class="btn-del">
                Eliminar
              </button>
            </div>
          </div>
        </main>
      </div>

      <div v-if="mostrarTicket" class="modal-overlay">
        <div class="ticket">
          <div class="ticket-head">
            <h3>GAMESHOP</h3>
            <p>RECIBO DE VENTA</p>
            <small>{{ new Date().toLocaleString() }}</small>
          </div>
          <div class="ticket-body">
            <div v-for="i in carrito" :key="i.id" class="ticket-row">
              <span>{{ i.cantidad }}x {{ i.titulo }}</span>
              <span>${{ i.precio * i.cantidad }}</span>
            </div>
            <div class="ticket-total">
              <span>TOTAL PAGADO</span>
              <span>${{ totalCarrito }}</span>
            </div>
          </div>
          <div class="ticket-footer">
            <p>¡Gracias por tu compra, {{ auth.user }}!</p>
            <button @click="limpiarYSalir" class="btn-close-ticket">Cerrar</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* BASE */
.app-shell { background: #0f172a; min-height: 100vh; color: #f1f5f9; font-family: 'Inter', sans-serif; }

/* LOGIN */
.login-screen { display: flex; align-items: center; justify-content: center; height: 100vh; }
.login-card { background: #1e293b; padding: 40px; border-radius: 20px; text-align: center; border: 1px solid #334155; width: 340px; }
.game-icon { font-size: 3rem; margin-bottom: 10px; }
.login-card h1 span { color: #3b82f6; }
.inputs input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; }
.btn-login { width: 100%; padding: 14px; background: #22c55e; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; }
.btn-login:hover { background: #16a34a; }

/* NAVBAR */
.navbar { display: flex; justify-content: space-between; padding: 15px 40px; background: #1e293b; border-bottom: 1px solid #334155; }
.brand { font-weight: 900; color: #3b82f6; letter-spacing: 1px; }
.btn-logout { background: #ef4444; border: none; color: white; padding: 5px 12px; border-radius: 6px; cursor: pointer; margin-left: 10px; }

/* LAYOUT TIENDA */
.main-content { display: grid; grid-template-columns: 300px 1fr; gap: 20px; padding: 20px; }
.sidebar { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; height: fit-content; }

/* CARRITO INTERACTIVO */
.cart-item { background: #0f172a; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #334155; }
.item-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
.item-controls { display: flex; align-items: center; justify-content: center; gap: 15px; }
.item-controls button { background: #3b82f6; border: none; color: white; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
.total-line { display: flex; justify-content: space-between; font-weight: bold; margin: 15px 0; color: #22c55e; font-size: 1.2rem; }
.btn-checkout { width: 100%; padding: 12px; background: #10b981; border: none; color: white; border-radius: 8px; font-weight: bold; cursor: pointer; }

/* CATALOGO */
.games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
.game-card { background: #1e293b; padding: 15px; border-radius: 12px; border: 1px solid #334155; text-align: center; }
.game-card img { width: 100%; border-radius: 8px; margin-bottom: 10px; aspect-ratio: 16/9; object-fit: cover; }
.price { color: #22c55e; font-weight: bold; font-size: 1.1rem; }
.btn-add { width: 100%; background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; }
.btn-del { width: 100%; background: #991b1b; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; }
.btn-api { background: #8b5cf6; color: white; width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }

/* MODAL TICKET */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.ticket { background: #fff; color: #000; padding: 30px; width: 320px; font-family: 'Courier New', Courier, monospace; border-radius: 2px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
.ticket-head { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
.ticket-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
.ticket-total { border-top: 2px solid #000; margin-top: 15px; padding-top: 10px; font-weight: bold; display: flex; justify-content: space-between; }
.ticket-footer { text-align: center; margin-top: 20px; }
.btn-close-ticket { margin-top: 15px; width: 100%; padding: 10px; background: #000; color: #fff; border: none; cursor: pointer; font-weight: bold; }
</style>