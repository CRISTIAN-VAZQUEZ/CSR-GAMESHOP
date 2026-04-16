import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const dbPath = path.join(process.cwd(), 'server', 'db.json')
  const method = event.method

  const readDB = () => {
    try {
      // Intentamos leer el archivo si existe
      if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (e) {
      console.error("Error leyendo DB, usando datos por defecto")
    }
    // Si falla o no existe, devolvemos los datos base para que el login no falle
    return { 
      usuarios: [
        { user: "admin", pass: "123", role: "admin" },
        { user: "invitado", pass: "abc", role: "user" }
      ], 
      juegos: [], 
      ventas: [] 
    }
  }

  const writeDB = (data: any) => {
    try {
      // Vercel dará error aquí, por eso usamos try/catch para que la app siga viva
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
    } catch (e) {
      console.warn("Escritura no permitida en Vercel (Temporal)")
    }
  }

  const db = readDB()
  if (method === 'GET') return db

  if (method === 'POST') {
    const body = await readBody(event)
    
    if (body.type === 'fetch-external') {
      try {
        const externalData: any = await $fetch('https://www.freetogame.com/api/games?platform=pc')
        const nuevos = externalData.slice(0, 8).map((g: any) => ({
          id: g.id,
          titulo: g.title,
          precio: Math.floor(Math.random() * (1200 - 400) + 400),
          imagen: g.thumbnail
        }))
        db.juegos = [...db.juegos, ...nuevos]
        writeDB(db)
        return { status: 'ok' }
      } catch (err) {
        throw createError({ statusCode: 500, statusMessage: 'Error API externa' })
      }
    }

    if (body.type === 'juego') {
      db.juegos.push({ ...body.data, id: Date.now() })
    } 
    
    if (body.type === 'venta') {
      db.ventas = db.ventas || []
      db.ventas.push(body.data)
    }

    writeDB(db)
    return { status: 'ok' }
  }

  if (method === 'DELETE') {
    const { id } = await readBody(event)
    db.juegos = db.juegos.filter((j: any) => j.id !== id)
    writeDB(db)
    return { status: 'eliminado' }
  }
})