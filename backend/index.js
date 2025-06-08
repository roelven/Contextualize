require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

console.log('Starting backend server...')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.LLM_OPENAI_API_KEY,
})

const genAI = new GoogleGenerativeAI(process.env.LLM_GEMINI_API_KEY)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: {
      supabase: !!process.env.SUPABASE_URL,
      openai: !!process.env.LLM_OPENAI_API_KEY
    }
  })
})

app.post('/api/llm', async (req, res) => {
  try {
    const { spaceId, messages, systemPrompt, provider = 'openai' } = req.body

    // Default system prompt if none provided
    const finalSystemPrompt = systemPrompt || 'You are Nimbus, a helpful AI assistant participating in a multiplayer chat. Respond conversationally and helpfully when mentioned with @Nimbus.'

    if (provider === 'openai') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          ...messages
        ],
      })

      const aiResponse = completion.choices[0].message.content

      const { error } = await supabase
        .from('messages')
        .insert({
          space_id: spaceId,
          content: aiResponse,
          is_ai: true
        })

      if (error) throw error

      res.json({ success: true, message: aiResponse })
    } else if (provider === 'gemini') {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
      
      const prompt = finalSystemPrompt + '\n\n' + messages.map(m => `${m.role}: ${m.content}`).join('\n')
      const result = await model.generateContent(prompt)
      const aiResponse = result.response.text()

      const { error } = await supabase
        .from('messages')
        .insert({
          space_id: spaceId,
          content: aiResponse,
          is_ai: true
        })

      if (error) throw error

      res.json({ success: true, message: aiResponse })
    } else {
      res.status(400).json({ error: 'Unsupported provider' })
    }
  } catch (error) {
    console.error('LLM API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`)
})