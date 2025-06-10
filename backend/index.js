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

// Handle both POST and GET for LLM endpoint (GET for SSE streaming)
app.all('/api/llm', async (req, res) => {
  try {
    // Extract parameters from either body (POST) or query (GET)
    let { spaceId, messages, systemPrompt, provider = 'openai', temperature = 0.7 } = 
      req.method === 'POST' ? req.body : {
        spaceId: req.query.spaceId,
        messages: JSON.parse(req.query.messages || '[]'),
        systemPrompt: req.query.systemPrompt,
        provider: req.query.provider || 'openai',
        temperature: parseFloat(req.query.temperature || '0.7')
      }

    // Default system prompt if none provided
    const finalSystemPrompt = systemPrompt || 'You are Nimbus, a helpful AI assistant participating in a multiplayer chat. Respond conversationally and helpfully when mentioned with @Nimbus.'

    if (provider === 'openai') {
      // Set up Server-Sent Events headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      })
      
      // Send initial connection event
      res.write('data: {"type": "start"}\n\n')
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          ...messages
        ],
        temperature: temperature,
        stream: true,
      })

      let fullResponse = ''
      
      try {
        // Stream the response chunks
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            fullResponse += content
            
            // Send chunk as SSE event
            res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`)
          }
        }
        
        // Save complete message to database only when streaming ends
        const { data: savedMessage, error: insertError } = await supabase
          .from('messages')
          .insert({
            space_id: spaceId,
            content: fullResponse,
            is_ai: true
          })
          .select()
          .single()
        
        if (insertError) throw insertError
        
        // Send completion event with message ID
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          messageId: savedMessage.id,
          content: fullResponse 
        })}\n\n`)
        
      } catch (streamError) {
        console.error('Streaming error:', streamError)
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Streaming failed' })}\n\n`)
      }
      
      res.end()
      return
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