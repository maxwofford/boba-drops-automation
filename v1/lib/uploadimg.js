let ngrokInstance = null
let ngrokURL = null

const ngrokServer = async () => {
  const ngrok = require('@ngrok/ngrok')
  ngrokInstance = await ngrok.forward({
    proto: 'http',
    addr: 9999,
    authtoken: Bun.env.NGROK_AUTH_TOKEN
  })
  ngrokURL = ngrokInstance.url()
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
  server.stop(true)
  await ngrokInstance.close()
}
export async function uploadImg(file) {
  const url = `${ngrokURL}/${file}`
  console.log(url)
  return  url
}

await startFileServer()