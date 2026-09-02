import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware for parsing JSON and urlencoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Google GenAI client lazily/safely
let genAiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment. AI responses will run in resilient fallback mode.');
    }
    genAiClient = new GoogleGenAI({ apiKey });
  }
  return genAiClient;
}

// Resilient Model Fallback Ladder (Ordered by availability, latency, and throughput)
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackOptions {
  systemInstruction?: string;
  temperature?: number;
}

interface StreamResult {
  modelUsed: string;
  ttftMs: number;
  totalMs: number;
  totalChars: number;
  chunkCount: number;
}

// Resilient Streaming Content Generator with Model Fallback
async function generateContentStreamWithFallback(
  contents: any,
  options: FallbackOptions = {},
  onChunk: (chunkText: string, model: string, meta: { isFirst: boolean; ttftMs: number }) => void
): Promise<StreamResult> {
  const ai = getGenAI();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to generate AI reflections.');
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    const startTime = performance.now();
    let ttftMs = 0;
    let chunkCount = 0;
    let totalChars = 0;
    let isFirstChunk = true;

    console.log(`[Gemini Server API] Calling model: "${model}" (Payload items: ${Array.isArray(contents) ? contents.length : 1})`);

    try {
      const streamResponse = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });

      for await (const chunk of streamResponse) {
        const text = chunk.text || '';
        if (text) {
          if (isFirstChunk) {
            ttftMs = performance.now() - startTime;
            isFirstChunk = false;
            console.log(`[Gemini Server Telemetry] First token received from "${model}" in ${ttftMs.toFixed(1)}ms (TTFT)`);
          }
          chunkCount++;
          totalChars += text.length;
          onChunk(text, model, { isFirst: chunkCount === 1, ttftMs });
        }
      }

      const totalMs = performance.now() - startTime;
      console.log(`[Gemini Server Telemetry] Finished stream with "${model}" | TTFT: ${ttftMs.toFixed(1)}ms | Total Duration: ${totalMs.toFixed(1)}ms | Chunks: ${chunkCount} | Chars: ${totalChars}`);

      return {
        modelUsed: model,
        ttftMs,
        totalMs,
        totalChars,
        chunkCount,
      };
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.statusCode || 500;
      const errorMsg = String(err?.message || '');
      console.warn(`[Gemini Stream Fallback] Model "${model}" failed (Status: ${statusCode}, ${errorMsg}). Trying next model...`);
    }
  }

  throw new Error(`All Gemini models in streaming fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

async function generateContentWithFallback(
  contents: any,
  options: FallbackOptions = {}
): Promise<{ text: string; modelUsed: string; latencyMs: number }> {
  const ai = getGenAI();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to generate AI reflections.');
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    const startTime = performance.now();
    console.log(`[Gemini Server API] Calling model: "${model}" (Non-streaming)`);

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });

      const latencyMs = performance.now() - startTime;
      const responseText = response.text || '';
      console.log(`[Gemini Server Telemetry] Non-streaming response received from "${model}" in ${latencyMs.toFixed(1)}ms (${responseText.length} chars)`);

      return { text: responseText, modelUsed: model, latencyMs };
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.statusCode || 500;
      const errorMsg = String(err?.message || '');
      console.warn(`[Gemini Fallback Ladder] Model "${model}" failed (Status: ${statusCode}, ${errorMsg}). Trying next model...`);
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Smart conversation history builder & role sanitizer
function prepareConversationContents(
  rawMessages: any[],
  currentEntry: string,
  mood: string
): { contents: any[]; historyTrimmed: boolean; originalCount: number; effectiveCount: number } {
  const originalCount = Array.isArray(rawMessages) ? rawMessages.length : 0;

  // Filter and normalize raw messages
  const sanitizedMessages: { role: 'user' | 'model'; content: string }[] = [];
  if (Array.isArray(rawMessages)) {
    for (const msg of rawMessages) {
      if (!msg || typeof msg !== 'object') continue;
      const text = String(msg.content || '').trim();
      if (!text) continue; // skip empty placeholder or in-flight messages

      // User messages are strictly 'user', Gemini/Assistant replies are strictly 'model'
      const normalizedRole: 'user' | 'model' =
        msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';

      sanitizedMessages.push({
        role: normalizedRole,
        content: text,
      });
    }
  }

  // If no previous messages, send just current entry reflection prompt
  if (sanitizedMessages.length === 0) {
    const defaultText = currentEntry && currentEntry.trim()
      ? `Here is my journal entry / reflection:\n\n${currentEntry}\n\nPlease share your mindful reflection, insights, and 1-2 constructive follow-up questions.`
      : 'Please share a mindful reflection to help me reflect on my day and feelings.';

    const initialContents = [
      {
        role: 'user',
        parts: [{ text: defaultText }],
      },
    ];

    console.log('[Gemini Server API] Prepared single-turn prompt (no prior history):');
    console.table(
      initialContents.map((c, i) => ({
        turn: i + 1,
        role: c.role,
        text: c.parts[0]?.text?.slice(0, 120),
      }))
    );

    return {
      contents: initialContents,
      historyTrimmed: false,
      originalCount: 0,
      effectiveCount: 1,
    };
  }

  // Handle long conversation trimming while preserving latest context
  const MAX_ACTIVE_MESSAGES = 12;
  let activeMessages = sanitizedMessages;
  let earlierSummary = '';
  let historyTrimmed = false;

  if (sanitizedMessages.length > MAX_ACTIVE_MESSAGES) {
    historyTrimmed = true;
    const earlierSlice = sanitizedMessages.slice(0, sanitizedMessages.length - 10);
    activeMessages = sanitizedMessages.slice(-10);

    const topicsSample = earlierSlice
      .filter((m) => m.role === 'user')
      .map((m) => m.content.slice(0, 80))
      .filter(Boolean)
      .join(' | ');

    if (topicsSample) {
      earlierSummary = `[Earlier conversation context: User discussed: "${topicsSample}"]\n\n`;
    }
  }

  // Guarantee that conversation starts with 'user'
  while (activeMessages.length > 0 && activeMessages[0].role !== 'user') {
    activeMessages.shift(); // remove leading model turns to maintain valid alternating sequence
  }

  // If all were model messages (edge case), fallback to user prompt
  if (activeMessages.length === 0) {
    activeMessages = [
      {
        role: 'user',
        content: currentEntry && currentEntry.trim() ? currentEntry : 'Hello, let us reflect together.',
      },
    ];
  }

  // Build clean alternating contents array
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (let i = 0; i < activeMessages.length; i++) {
    const msg = activeMessages[i];
    let turnText = msg.content;

    // Anchor root journal entry context onto the first user turn if present
    if (i === 0 && currentEntry && currentEntry.trim()) {
      const rootContext = `[Root Journal Context: "${currentEntry.trim().slice(0, 500)}..."]\n\n`;
      turnText = `${earlierSummary}${rootContext}${turnText}`;
    }

    const prevTurn = contents.length > 0 ? contents[contents.length - 1] : null;

    if (prevTurn && prevTurn.role === msg.role) {
      // Merge consecutive same-role turns to avoid invalid consecutive turns in Gemini API
      prevTurn.parts[0].text += `\n\n${turnText}`;
    } else {
      contents.push({
        role: msg.role,
        parts: [{ text: turnText }],
      });
    }
  }

  // Ensure last turn is ALWAYS 'user' so Gemini generates the next 'model' reply
  if (contents.length > 0 && contents[contents.length - 1].role === 'model') {
    contents.push({
      role: 'user',
      parts: [{ text: 'Please continue our reflection based on what we have discussed.' }],
    });
  }

  // Console log the full role-tagged history array before sending to Gemini
  console.log(`[Gemini Server API] Full role-tagged history array prepared for API (${contents.length} turns):`);
  console.table(
    contents.map((c, idx) => ({
      turn: idx + 1,
      role: c.role,
      preview: c.parts?.[0]?.text?.slice(0, 100) + '...',
      charCount: c.parts?.[0]?.text?.length || 0,
    }))
  );

  return {
    contents,
    historyTrimmed,
    originalCount,
    effectiveCount: contents.length,
  };
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    primaryModel: 'gemini-3.6-flash',
  });
});

// Multi-turn Journal Reflection Chat Endpoint (Streaming & Non-Streaming)
app.post('/api/chat', async (req, res) => {
  const reqStart = performance.now();
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { messages = [], currentEntry = '', mood = '', tags = [], stream = true } = data;

    if (!currentEntry && (!Array.isArray(messages) || messages.length === 0)) {
      return res.status(400).json({ error: 'Journal message or entry content is required.' });
    }

    const { contents, historyTrimmed, originalCount, effectiveCount } = prepareConversationContents(
      messages,
      currentEntry,
      mood
    );

    const systemInstruction = `You are a compassionate, thoughtful, and insightful AI Mindfulness & Journaling Companion.
Your role is to help the user reflect deeply, gain perspective, unpack emotions, celebrate personal victories, and brainstorm constructive paths forward.

Context for this session:
- Mood: ${mood || 'Not specified'}
- Tags: ${Array.isArray(tags) ? tags.join(', ') : 'None'}

Guidelines:
1. Be warm, empathetic, and constructive without being overly clinical or dismissive.
2. Provide thoughtful reflection, identify underlying strengths or thinking patterns, and ask 1-2 open-ended deepening questions.
3. Keep responses concise and engaging (2 to 4 short paragraphs).
4. Never give dangerous medical or psychological diagnoses; frame insights as mindful self-inquiry.
5. Format key insights using Markdown (bullet points, bold highlights) for pleasant readability.`;

    // Compute exact character count metrics for request payload analysis
    const historyChars = contents.reduce((acc, c) => acc + (c.parts?.[0]?.text?.length || 0), 0);
    const systemChars = systemInstruction.length;
    const totalPayloadChars = historyChars + systemChars;

    console.log(`[Gemini Chat Endpoint] Request received | Total history: ${originalCount} msgs -> ${effectiveCount} msgs sent ${historyTrimmed ? '(trimmed)' : '(untrimmed)'} | Stream: ${stream}`);
    console.log(`[Gemini Payload Telemetry - /api/chat] Total Payload Size: ${totalPayloadChars} chars | Conversation History (${contents.length} turns): ${historyChars} chars | System Instruction: ${systemChars} chars | Approx Tokens: ~${Math.round(totalPayloadChars / 4)}`);

    if (stream) {
      // Server-Sent Events (SSE) Streaming Response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      try {
        const streamResult = await generateContentStreamWithFallback(
          contents,
          { systemInstruction, temperature: 0.7 },
          (chunkText, model, meta) => {
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText, model, ttftMs: meta.ttftMs })}\n\n`);
          }
        );

        const totalServerTime = performance.now() - reqStart;
        res.write(`data: ${JSON.stringify({
          type: 'done',
          modelUsed: streamResult.modelUsed,
          ttftMs: streamResult.ttftMs,
          totalMs: streamResult.totalMs,
          totalChars: streamResult.totalChars,
          chunkCount: streamResult.chunkCount,
          serverLatencyMs: totalServerTime,
          historyTrimmed,
        })}\n\n`);

        res.end();
      } catch (streamErr: any) {
        console.error('[Gemini Chat Endpoint] Stream error:', streamErr);
        res.write(`data: ${JSON.stringify({ type: 'error', error: streamErr?.message || 'Streaming failed' })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming fallback
      const { text, modelUsed, latencyMs } = await generateContentWithFallback(contents, {
        systemInstruction,
        temperature: 0.7,
      });

      res.json({
        reply: text,
        modelUsed,
        latencyMs,
        historyTrimmed,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error?.message || 'Failed to generate AI reflection.',
      });
    }
  }
});

// Single Entry Summarize & Insight Generator
app.post('/api/summarize', async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { content = '', messages = [], mood = '' } = data;

    if (!content && messages.length === 0) {
      return res.status(400).json({ error: 'Entry content is required to summarize.' });
    }

    let fullText = content;
    if (Array.isArray(messages) && messages.length > 0) {
      fullText += '\n\nConversation Details:\n' + messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
    }

    const systemInstruction = `You are an expert mindfulness analyst. Return a clean JSON object summarizing this journal entry.
Format your output as valid JSON matching this schema:
{
  "title": "A short, evocative 3-6 word title for this entry",
  "summary": "2-3 sentence core summary of the reflection",
  "themes": ["theme1", "theme2", "theme3"],
  "sentiment": "positive" | "reflective" | "neutral" | "challenging" | "mixed",
  "actionableTakeaway": "One empowering, practical micro-action or affirmation"
}
Ensure only raw JSON is returned, without markdown backticks.`;

    const summarizeInputText = `Mood: ${mood}\n\nJournal Content:\n${fullText}`;
    const totalPayloadChars = summarizeInputText.length + systemInstruction.length;

    console.log(`[Gemini Summarize Endpoint] Request received | Messages in history: ${messages.length} | Journal text length: ${content.length} chars`);
    console.log(`[Gemini Payload Telemetry - /api/summarize] Total Payload Size: ${totalPayloadChars} chars | Input Content (Journal + Msgs): ${summarizeInputText.length} chars | System Instruction: ${systemInstruction.length} chars | Approx Tokens: ~${Math.round(totalPayloadChars / 4)}`);

    const { text } = await generateContentWithFallback(
      [{ role: 'user', parts: [{ text: summarizeInputText }] }],
      { systemInstruction, temperature: 0.3 }
    );

    let parsed: any;
    try {
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        title: 'Mindful Reflection',
        summary: text.slice(0, 200),
        themes: ['reflection', 'growth'],
        sentiment: 'reflective',
        actionableTakeaway: 'Take a deep breath and acknowledge your journey today.',
      };
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/summarize:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate summary.' });
  }
});

// Weekly AI Digest Generator (Cloud Scheduler simulation / on-demand trigger)
app.post('/api/weekly-digest', async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { entries = [], startDate = '', endDate = '' } = data;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'No journal entries provided for weekly analysis.' });
    }

    const entriesSummary = entries.map((e: any, idx: number) => {
      return `Entry ${idx + 1} (${e.date || 'Recent'}):
Mood: ${e.mood || 'N/A'}
Tags: ${Array.isArray(e.tags) ? e.tags.join(', ') : 'None'}
Content: ${e.content?.slice(0, 400) || 'N/A'}
Summary: ${e.summary || 'N/A'}`;
    }).join('\n---\n');

    const systemInstruction = `You are a holistic wellness and personal growth coach analyzing a user's weekly journal logs.
Generate a comprehensive weekly AI digest that celebrates their growth, tracks emotional trajectory, and provides mindful foresight for next week.

Return valid raw JSON matching this structure (no markdown fences):
{
  "weekRange": "${startDate} to ${endDate}",
  "headline": "Empowering, tailored 1-sentence headline for this week",
  "overview": "3-4 sentence holistic synthesis of the week's experiences and emotional patterns",
  "topThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
  "moodTrends": "Brief narrative description of the emotional arc and resilience shown",
  "celebrations": ["Victory or positive highlight 1", "Victory or positive highlight 2"],
  "mindfulInquiryForNextWeek": ["Prompt 1 for the coming week", "Prompt 2 for the coming week"],
  "recommendedFocus": "Specific mindful habit or grounding practice for next week"
}`;

    const { text, modelUsed } = await generateContentWithFallback(
      [{ role: 'user', parts: [{ text: `Here are the journal entries for this period:\n\n${entriesSummary}` }] }],
      { systemInstruction, temperature: 0.4 }
    );

    let digest: any;
    try {
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      digest = JSON.parse(cleaned);
    } catch {
      digest = {
        weekRange: `${startDate} to ${endDate}`,
        headline: 'A week of mindful self-reflection and steady growth',
        overview: text.slice(0, 300),
        topThemes: ['Self-Awareness', 'Daily Progress', 'Mindfulness'],
        moodTrends: 'Consistent engagement with personal thoughts and emotional balance.',
        celebrations: ['Maintained consistent journal entries', 'Engaged in meaningful self-reflection'],
        mindfulInquiryForNextWeek: ['What intention will guide my decisions next week?'],
        recommendedFocus: 'Celebrate small wins daily and take intentional pause breaks.',
      };
    }

    digest.modelUsed = modelUsed;
    digest.generatedAt = new Date().toISOString();

    res.json(digest);
  } catch (error: any) {
    console.error('Error in /api/weekly-digest:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate weekly digest.' });
  }
});

// Dynamic Personalized Prompt Suggestions
app.post('/api/prompt-library', async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { recentMoods = [], recentTags = [], timeOfDay = 'evening' } = data;

    const defaultPrompts = [
      { id: '1', category: 'Gratitude', prompt: 'What is one moment today that made you smile or feel genuinely at ease?' },
      { id: '2', category: 'Overcoming Challenges', prompt: 'What felt heavy or difficult today, and how did you handle it?' },
      { id: '3', category: 'Self-Discovery', prompt: 'What is something you learned about yourself or your boundaries recently?' },
      { id: '4', category: 'Intention Setting', prompt: 'If tomorrow could have one defining quality (e.g., calm, focus, courage), what would you choose?' },
      { id: '5', category: 'Letting Go', prompt: 'What is one thought or worry you are willing to release onto this page right now?' },
      { id: '6', category: 'Celebration', prompt: 'What is a small, quiet victory you achieved today that no one else noticed?' },
    ];

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ prompts: defaultPrompts });
    }

    try {
      const { text } = await generateContentWithFallback(
        [{
          role: 'user',
          parts: [{
            text: `Generate 6 personalized, inspiring, deep reflection prompts for a journaling app.
Context: Time of day is ${timeOfDay}. Recent user moods: ${recentMoods.join(', ') || 'neutral'}. Recent topics/tags: ${recentTags.join(', ') || 'general'}.
Return raw JSON format without markdown code blocks:
[
  { "id": "1", "category": "Category Name", "prompt": "Prompt text..." },
  ...
]`
          }]
        }],
        { temperature: 0.7 }
      );

      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const customPrompts = JSON.parse(cleaned);
      if (Array.isArray(customPrompts) && customPrompts.length > 0) {
        return res.json({ prompts: customPrompts });
      }
    } catch {
      // Return defaults on parse issue
    }

    res.json({ prompts: defaultPrompts });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch prompt library.' });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
