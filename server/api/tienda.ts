import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const dbPath = path.join(process.cwd(), 'server', 'db.json')
  const method = event.method

  const readDB = () => {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8')
      return JSON.parse(data)
    } catch (e) {
      return { usuarios: [], juegos: [], ventas: [] }
    }
  }

  const writeDB = (data: any) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
  const db = readDB()

  if (method === 'GET') return db

  if (method === 'POST') {
    const body = await readBody(event)
    
    // NUEVO: Proxy para evitar error de CORS
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
        throw createError({ statusCode: 500, statusMessage: 'Error conectando con API externa' })
      }
    }

    if (body.type === 'juego') {
      db.juegos.push({ ...body.data, id: Date.now() })
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