const ngrok = require('ngrok')
let ngrokURL = null

const ngrokServer = async () => {
  ngrokURL = await ngrok.connect({
    proto: 'http',
    addr: 9999
  })
}

const server = Bun.serve({
  port: 9999,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file('./tmp' + path);
    return new Response(file);
  }
})


export async function startFileServer() {
  await ngrokServer()
  return server
}
export async function stopFileServer() {
  await server.stop(true)
  await ngrok.disconnect()
}
export async function uploadImg(file) {
  const url = `${ngrokURL}/${file}`
  console.log(url)
  return  url
}

await startFileServer()
// console.log(await uploadImg('screenshot-0.74d0c1fbbe163.png'))