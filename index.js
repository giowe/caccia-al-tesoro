const express = require("express")
const app = express()
const path = require("path")

const PORT = 8080
const MAP_SIZE = 10
const NUMBER_OF_TREASURES = 1

// Initialize the map with false values for dug and treasure
const map = []
for (let y = 0; y < MAP_SIZE; y++) {
  const row = []
  for (let x = 0; x < MAP_SIZE; x++) {
    row.push({ x, y, dug: false, treasure: false, dugBy: null })
  }
  map.push(row)
}

// Randomly generate treasure locations
const treasures = []
for (let i = 0; i < NUMBER_OF_TREASURES; i++) {
  let x, y, duplicate
  do {
    x = Math.floor(Math.random() * MAP_SIZE)
    y = Math.floor(Math.random() * MAP_SIZE)
    duplicate = treasures.some(t => t.x === x && t.y === y)
  } while (duplicate)

  treasures.push({ x, y })
  map[y][x].treasure = true
}

const teams = {}

// GET endpoint for team signup
app.get("/signup", (req, res) => {
  const { team, password } = req.query
  if (!team || !password) {
    res.status(400).json({ message: "Team and password are required", code: "MISSING_DATA" })
    return
  }

  if (teams[team]) {
    res.status(409).json({ message: "Team already taken", code: "TEAM_TAKEN" })
    return
  }

  teams[team] = { password, score: 0, lastDigTime: 0 }
  res.status(200).json({ message: "Team registered successfully", code: "REGISTRATION_SUCCESSFUL" })
})

// GET endpoint for digging
app.get("/dig", (req, res) => {
  const { x, y, team, password } = req.query
  const currentTime = new Date().getTime()

  if (!teams[team] || teams[team].password !== password) {
    res.status(401).json({ message: "Unauthorized team or incorrect password", code: "AUTHENTICATION_FAILED" })
    return
  }

  if (currentTime - teams[team].lastDigTime < 2000) {
    res.status(429).json({ message: "You are digging too fast. Wait for 2 seconds", code: "TOO_FAST" })
    return
  }

  teams[team].lastDigTime = currentTime

  const digX = parseInt(x)
  const digY = parseInt(y)

  if (
    isNaN(digX) ||
    isNaN(digY) ||
    digX < 0 ||
    digX >= MAP_SIZE ||
    digY < 0 ||
    digY >= MAP_SIZE
  ) {
    res.status(400).json({ message: "Invalid coordinates", code: "INVALID_COORDINATES" })
    return
  }

  if (map[digY][digX].dug) {
    teams[team].score -= 10
    res.status(400).json({ message: "Already dug here", code: "ALREADY_DUG" })
    return
  }

  map[digY][digX].dug = true
  map[digY][digX].dugBy = team

  if (map[digY][digX].treasure) {
    teams[team].score += 100
    res.status(200).json({ message: "You found a TREASURE!", code: "TREASURE_FOUND" })
    return
  }

  let closestTreasureDistance = null
  let closestTreasure = null
  for (let i = 0; i < treasures.length; i++) {
    const t = treasures[i]
    if (!map[t.y][t.x].dug) {
      
      const distance = Math.sqrt(Math.pow(digX - t.x, 2) + Math.pow(digY - t.y, 2))
      console.log({
        distance,
        digX,
        digY,
        x: t.x,
        y: t.y
      })
      if (closestTreasureDistance === null || distance < closestTreasureDistance) {
        closestTreasureDistance = distance;
        closestTreasure = t
      }
    }
  }

  console.log({ closestTreasureDistance, closestTreasure } )
  let response
  if (closestTreasureDistance > 0 && closestTreasureDistance <= 2) {
    response = { message: "You are VERY close!", code: "VERY_CLOSE" }
  } else if (closestTreasureDistance > 2 && closestTreasureDistance <= 5) {
    response = { message: "You are close", code: "CLOSE" }
  } else {
    response = { message: "You are far away", code: "FAR_AWAY" }
  }

  res.status(200).json(response)
})

// GET endpoint to view the map
app.get("/map", (req, res) => {
  const mapClone = JSON.parse(JSON.stringify(map))

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (!mapClone[y][x].dug) {
        mapClone[y][x].treasure = null
      }
    }
  }

  res.status(200).json(clone)
})

// GET endpoint for the leaderboard
app.get("/leaderboard", (req, res) => {
  const scores = []
  for (const team in teams) {
    scores.push({ name: team, score: teams[team].score })
  }
  scores.sort((a, b) => b.score - a.score)
  res.status(200).json(scores)
})

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')))

// GET endpoint to display the map as an HTML page
app.get("/displayMap", (req, res) => {
  let html = "<html><body><table style='border-collapse: collapse;'>"

  for (let y = 0; y < MAP_SIZE; y++) {
    html += "<tr>"
    for (let x = 0; x < MAP_SIZE; x++) {
      const cell = map[y][x]
      let imgSrc = 'grass.png'
      if (cell.dug && cell.treasure) {
        imgSrc = 'treasure.png'
      } else if (cell.dug) {
        imgSrc = 'hole.png'
      }
      html += `<td style='border: 1px solid black;'><img src="${imgSrc}" width="50" height="50"></td>`
    }
    html += "</tr>"
  }

  html += "</table></body></html>"
  res.send(html)
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
