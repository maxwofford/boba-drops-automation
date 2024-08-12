const puppeteer = require("puppeteer");
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
let browser = null;
await startFileServer()
await puppeteer
  .launch()
  .then(async (browser) => {
    const page = await browser.newPage();
    for (const website of websites.slice(0, 10)) {
      let url = website.get("GitHub Pages URL")
      if (!url.includes("http")) {
        url = `https://${url}`
      }
      console.log("Processing website:", url)
      const fieldsToUpdate = {
        "Automation– take screenshot": false
      }
      try {
        await page.goto(url);

        await Bun.sleep(5000) // wait for ratelimit

        // Save screenshot to a file
        const randomHex = Math.random().toString(16)
        const tempfileName = `screenshot-${randomHex}.png`
        const tempfilePath = `${tempdir}/${tempfileName}`
        await page.screenshot({ path: tempfilePath })
        filesToDelete.push(tempfilePath)

        const screenshotUrl = await uploadImg(tempfileName)

        // Update Airtable with screenshot URL
        fieldsToUpdate["Screenshot"] = [{ url: screenshotUrl }]
      } catch(e) {
        console.error(e)
      } finally {
        await websitesBase.update(website.id, fieldsToUpdate)
      }
    }
  })
  .catch((error) => {
    console.error(error)
  })
  .finally(async () => {
    await Bun.sleep(10 * 1000) // wait for file uploads to end
    filesToDelete.forEach(async (file) => {
      if (await Bun.file(file).exists()) {
        await unlink(file)
      }
    })
    await stopFileServer()

    browser && browser.close()

    process.exit(0)
  })

console.log("No sites to screenshot!")
Bun.sleep(5 * 1000)