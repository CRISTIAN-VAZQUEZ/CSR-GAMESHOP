import fs from 'node:fs'
import path from 'node:path'

// Variable global para mantener los datos en la memoria del servidor (crucial para Vercel)
let memoryDb: any = null;

export default defineEventHandler(async (event) => {
  const dbPath = path.join(process.cwd(), 'server', 'db.json')
  const method = event.method

  const readDB = () => {
    // Si ya cargamos datos en esta sesión, los usamos de la memoria
    if (memoryDb) return memoryDb;

    try {
      if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf-8')
        memoryDb = JSON.parse(data)
        return memoryDb
      }
    } catch (e) {
      console.error("Error leyendo disco, inicializando memoria por defecto")
    }

    // Datos de respaldo si el archivo no existe o no se puede leer
    memoryDb = { 
      usuarios: [
        { user: "admin", pass: "123", role: "admin" },
        { user: "invitado", pass: "abc", role: "user" }
      ], 
      juegos: [], 
      ventas: [] 
    }
    return memoryDb
  }

  const writeDB = (data: any) => {
    memoryDb = data; // Guardamos en memoria siempre
    try {
      // Intentamos escribir en disco (solo funcionará en tu PC local)
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
    } catch (e) {
      // En Vercel fallará silenciosamente, pero la app seguirá funcionando con memoryDb
    }
  }

  const db = readDB()

  if (method === 'GET') return db

  if (method === 'POST') {
    const body = await readBody(event)
    
    // CASO 1: Traer juegos de API externa
    if (body.type === 'fetch-external') {
      try {
        const externalData: any = await $fetch('https://www.freetogame.com/api/games?platform=pc')
        const nuevos = externalData.slice(0, 8).map((g: any) => ({
          id: g.id,
          titulo: g.title,
          precio: Math.floor(Math.random() * (1200 - 400) + 400),
          imagen: g.thumbnail
        }))
        
        // Actualizamos la lista de juegos
        db.juegos = [...(db.juegos || []), ...nuevos]
        writeDB(db)
        return { status: 'ok' }
      } catch (err) {
        throw createError({ statusCode: 500, statusMessage: 'Error conectando con API externa' })
      }
    }

    // CASO 2: Agregar un juego manualmente
    if (body.type === 'juego') {
      db.juegos.push({ ...body.data, id: Date.now() })
    } 
    
    // CASO 3: Registrar una venta
    if (body.type === 'venta') {
      db.ventas = db.ventas || []
      db.ventas.push(body.data)
    }

    writeDB(db)
    return { status: 'ok' }
  }

  if (method === 'DELETE') {
    const { id } = await readBody(event)
    db.juegos = (db.juegos || []).filter((j: any) => j.id !== id)
    writeDB(db)
    return { status: 'eliminado' }
  }
})