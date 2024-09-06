const tempdir = './tmp'
import { unlink } from "node:fs/promises"

const Airtable = require('airtable');
const { startFileServer, stopFileServer, uploadImg } = await import("./lib/uploadimg");
Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY })
const base = Airtable.base('app05mIKwNPO2l1vT');
const websitesBase = base('Websites');

const websites = await websitesBase.select({
  filterByFormula: "{Automation– take screenshot} = TRUE()"
}).all()

console.log("Processing websites:", websites.length)
if (websites.length === 0) { process.exit(0) }

let filesToDelete = []
await startFileServer()

for (const website of websites.slice(0, 10)) {
  let url = website.get("GitHub Pages URL")
  if (!url.includes('http')) {
    url = 'https://' + url
  }
  console.log("Processing website:", url)
  const fieldsToUpdate = {
    "Automation– take screenshot": false
  }
  await fetch (`https://chrome.browserless.io/screenshot?token=${Bun.env.BROWSERLESSIO_TOKEN}`, {
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
    // Save screenshot to a file
    const randomHex = Math.random().toString(16)
    const tempfileName = `screenshot-${randomHex}.png`
    const tempfilePath = `${tempdir}/${tempfileName}`
    await Bun.write(tempfilePath, data)

    // Update Airtable with screenshot URL
    const screenshotUrl = await uploadImg(tempfileName)
    fieldsToUpdate["Screenshot"] = [{ url: screenshotUrl }]

    filesToDelete.push(tempfilePath)
  }).finally(async () => {
    await websitesBase.update(website.id, fieldsToUpdate)
  })
}

if (filesToDelete.length == 0) {
  console.log("No sites to screenshot!")
  Bun.sleep(5 * 1000)
} else {
  console.log("Spinning down...")
  await Bun.sleep(10 * 1000) // wait for file uploads to end
  filesToDelete.forEach(async (file) => {
    if (await Bun.file(file).exists()) {
      await unlink(file)
    }
  })
  await stopFileServer()
}