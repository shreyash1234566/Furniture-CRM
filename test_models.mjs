import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
const apiKey = env.match(/NVIDIA_API_KEY=(.*)/)[1].trim();

async function testModel(model) {
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 50
      })
    });
    console.log(model, res.status);
    if(res.ok) {
        const body = await res.json();
        console.log(body.choices[0].message.content);
    }
  } catch (e) {
    console.log(model, 'ERROR', e.message);
  }
}

await testModel('meta/llama-3.1-70b-instruct');
await testModel('meta/llama-3.1-405b-instruct');
await testModel('moonshotai/kimi-k2.5');
