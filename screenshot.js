const puppeteer = require("puppeteer");
// const imgbbUploader = require("imgbb-uploader");
const tempdir = './tmp'

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

let browser = null;
await startFileServer()
await puppeteer
  .launch()
  .then(async (browser) => {
    const page = await browser.newPage();
    for (const website of websites.slice(0, 25)) {
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
        await page.screenshot({ path: tempfileName })

        // Upload screenshot to imgbb
        // const screenshotUrl = await imgbbUploader(process.env.IMGBB_API_KEY, tempfileName)
        //   .then((response) => response.url)
        //   .catch(e => {
        //     console.error(e)
        //     return null
        //   })
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
  .finally(() => browser && browser.close())

await stopFileServer()