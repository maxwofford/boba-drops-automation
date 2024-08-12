async function checkWaybackMachine(url) {
  const response = await fetch(`https://archive.org/wayback/available?url=${url}`);
  const data = await response.json();
  return data.archived_snapshots.closest;
}

async function submitWaybackMachine(url) {
  const response = await fetch(`https://web.archive.org/save/${url}`);
  return response;
}

const Airtable = require('airtable');
Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY })
const base = Airtable.base('app05mIKwNPO2l1vT');
const websitesBase = base('Websites');

const websites = await websitesBase.select({
  filterByFormula: "{Automation– archive on waybackmachine} = TRUE()"
}).all()

console.log("Processing websites:", websites.length)

for (const website of websites.slice(0, 50)) {
  const url = website.fields["GitHub Pages URL"]
  console.log("Processing website:", url)
  try {
    const alreadyArchived = await checkWaybackMachine(url)
    if (alreadyArchived) {
      console.log("Website already archived on waybackmachine")
    } else {
      console.log("Submitting website to waybackmachine")
      console.log(await submitWaybackMachine(url))
      await Bun.sleep(5 * 1000) // wait for ratelimit
    }
  } catch(e) {
    console.error(e)
  } finally {
    await websitesBase.update(website.id, {
      "Automation– archive on waybackmachine": false
    })
  }
  await Bun.sleep(5 * 1000) // wait for ratelimit
}
