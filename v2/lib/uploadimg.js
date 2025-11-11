export async function startFileServer() {
  // No longer needed with bucky
}

export async function stopFileServer() {
  // No longer needed with bucky
}

export async function uploadImg(filePath) {
  const formData = new FormData()
  const file = Bun.file(filePath)
  formData.append('file', file)
  
  const response = await fetch('https://bucky.hackclub.com', {
    method: 'POST',
    body: formData
  })
  
  const url = await response.text()
  console.log(url)
  return url.trim()
}
