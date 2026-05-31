export async function processFiles(files) {
  const results = [];
  for (const file of files) {
    const b64 = await toBase64(file);
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    results.push({ b64, mime: file.type || 'image/jpeg', preview, name: file.name });
  }
  return results;
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
