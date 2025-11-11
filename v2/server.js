import { unlink } from "node:fs/promises"
import { startFileServer, stopFileServer, uploadImg } from "./lib/uploadimg"

const tempdir = './tmp'
const lockfile = '/tmp/boba-drops-automation-v2.lock'

await startFileServer()

let isProcessing = false

async function processScreenshots() {
  if (isProcessing) {
    return { processed: 0, message: "Job already running", status: "locked" }
  }
  
  if (await Bun.file(lockfile).exists()) {
    return { processed: 0, message: "Job already running (lockfile exists)", status: "locked" }
  }
  
  isProcessing = true
  await Bun.write(lockfile, new Date().toISOString())
  
  try {
  const selectParams = {
    filterByFormula: "{Automation– take screenshot} = TRUE()",
    maxRecords: 10
  }
  
  const apiUrl = `https://api2.hackclub.com/v0.1/Boba%20Drops/Websites?select=${encodeURIComponent(JSON.stringify(selectParams))}`
  const response = await fetch(apiUrl)
  const websites = await response.json()

  console.log("Processing websites:", websites.length)
  
  if (websites.length === 0) {
    return { processed: 0, message: "No sites to screenshot" }
  }

  let filesToDelete = []
  let recordsToUpdate = []

  for (const website of websites) {
    let url = website.fields["Playable URL"]
    if (!url.includes('http')) {
      url = 'https://' + url
    }
    
    const fieldsToUpdate = {
      "Automation– take screenshot": false
    }

    await fetch(`https://chrome.browserless.io/screenshot?token=${Bun.env.BROWSERLESSIO_TOKEN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({
        url: url,
        options: {
          fullPage: true,
          type: "png"
        }
      })
    }).then(r => r.blob()).then(async data => {
      const randomHex = Math.random().toString(16)
      const tempfileName = `screenshot-${randomHex}.png`
      const tempfilePath = `${tempdir}/${tempfileName}`
      await Bun.write(tempfilePath, data)

      const screenshotUrl = await uploadImg(tempfilePath)
      fieldsToUpdate["Screenshot"] = [{ 
        url: screenshotUrl,
        filename: tempfileName
      }]
      fieldsToUpdate["Automation– take screenshot"] = false

      filesToDelete.push(tempfilePath)
    })
    
    recordsToUpdate.push({
      id: website.id,
      fields: fieldsToUpdate
    })
  }

  if (recordsToUpdate.length > 0) {
    await fetch(`https://api.airtable.com/v0/app05mIKwNPO2l1vT/Websites`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AIRTABLE_API_KEY}`
      },
      body: JSON.stringify({ records: recordsToUpdate })
    })
  }

  for (const file of filesToDelete) {
    if (await Bun.file(file).exists()) {
      await unlink(file)
    }
  }

  return { processed: websites.length, message: `Processed ${websites.length} screenshots`, status: "success" }
  } finally {
    isProcessing = false
    if (await Bun.file(lockfile).exists()) {
      await unlink(lockfile)
    }
  }
}

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url)
    
    if (url.pathname === "/") {
      return Response.redirect("https://github.com/maxwofford/boba-drops-automation/", 302)
    }
    
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }
    
    if (url.pathname === "/trigger") {
      const authHeader = req.headers.get("Authorization")
      const expectedToken = process.env.AUTH_TOKEN
      
      if (expectedToken && (!authHeader || authHeader !== `Bearer ${expectedToken}`)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        })
      }
      
      if (isProcessing || await Bun.file(lockfile).exists()) {
        return new Response(JSON.stringify({ message: "Job already running", status: "locked" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      }
      
      processScreenshots().catch(error => {
        console.error("Error processing screenshots:", error)
      })
      
      return new Response(JSON.stringify({ message: "Job started", status: "processing" }), {
        status: 202,
        headers: { "Content-Type": "application/json" }
      })
    }
    
    return new Response("Not Found", { status: 404 })
  }
})

console.log(`Server running on port ${server.port}`)
