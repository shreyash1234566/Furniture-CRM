const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const stAB = env.match(/STABILITY_API_KEY=(.*)/)[1].trim();

async function test() {
  const fd = new FormData();
  const fileBuffer = fs.readFileSync('dummy2.jpg');
  fd.append('image', new Blob([fileBuffer], {type:'image/jpeg'}), 'dummy.jpg');
  fd.append('reference_image', new Blob([fileBuffer], {type:'image/jpeg'}), 'dummy.jpg');
  fd.append('search_prompt', 'right most pot and the wall behind it');
  fd.append('prompt', 'tall wooden dressing table with mirror');
  fd.append('output_format', 'webp');
  
  const res = await fetch('https://api.stability.ai/v2beta/stable-image/edit/search-and-replace', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + stAB, Accept: 'application/json' },
    body: fd
  });
  console.log(await res.text());
}
test();
