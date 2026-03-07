import OpenAI from 'openai';
import { executeQuery, listGoldTables, getTableSchema } from './snowflake-client';
import { SCHEMA_CONTEXT, SYSTEM_PROMPT } from './schema-context';

const MAX_TOOL_ROUNDS = 8;

// Tools in OpenAI function calling format
const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'execute_sql',
      description: 'Execute a SQL query on the Snowflake GOLD schema. Use this to retrieve data for analysis. Always query from GOLD.* tables. Returns up to 50 rows.',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'The SQL query to execute. Must use GOLD schema (e.g., SELECT * FROM GOLD.CAMPAIGN_DAILY)' },
          purpose: { type: 'string', description: 'Brief description of why you are running this query' },
        },
        required: ['sql', 'purpose'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tables',
      description: 'List all available tables in the GOLD schema with row counts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_table_schema',
      description: 'Get the column names and types for a specific GOLD table.',
      parameters: {
        type: 'object',
        properties: {
          table_name: { type: 'string', description: 'Table name without schema prefix (e.g., CAMPAIGN_DAILY)' },
        },
        required: ['table_name'],
      },
    },
  },
];

async function handleToolCall(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case 'execute_sql': {
      const sql = toolInput.sql as string;
      // Safety: only allow SELECT queries
      const trimmed = sql.trim().toUpperCase();
      if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
        return JSON.stringify({ error: 'Only SELECT queries are allowed.' });
      }
      // Add LIMIT if not present to prevent huge results
      const hasLimit = /LIMIT\s+\d+/i.test(sql);
      const safeSql = hasLimit ? sql : `${sql} LIMIT 50`;

      try {
        const result = await executeQuery(safeSql);
        return JSON.stringify({
          columns: result.columns,
          rows: result.rows,
          row_count: result.rowCount,
          note: result.rowCount === 50 ? 'Results truncated at 50 rows. Add a more specific WHERE clause or GROUP BY to see aggregated data.' : undefined,
        });
      } catch (err) {
        return JSON.stringify({ error: (err as Error).message });
      }
    }

    case 'list_tables': {
      const tables = await listGoldTables();
      return JSON.stringify({ tables });
    }

    case 'get_table_schema': {
      const tableName = toolInput.table_name as string;
      const schema = await getTableSchema(tableName);
      return JSON.stringify({ columns: schema.rows });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
): Promise<{ response: string; history: ChatMessage[]; queriesExecuted: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI({ apiKey });

  const systemPrompt = `${SYSTEM_PROMPT}\n\n${SCHEMA_CONTEXT}`;

  // Build messages
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  let queriesExecuted = 0;

  // Agentic loop: GPT calls tools, we execute them, repeat until GPT gives final answer
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Check if GPT wants to use tools
    if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
      // Add assistant message with tool calls
      messages.push(message);

      // Process each tool call
      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const fn = toolCall.function;
        const args = JSON.parse(fn.arguments);
        console.log(`  [Tool] ${fn.name}: ${args.purpose || JSON.stringify(args).slice(0, 100)}`);
        const result = await handleToolCall(fn.name, args);
        queriesExecuted++;

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    } else {
      // GPT gave a final text response
      const textContent = message.content || '';

      const updatedHistory: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: textContent },
      ];

      return { response: textContent, history: updatedHistory, queriesExecuted };
    }
  }

  throw new Error('Agent exceeded maximum tool rounds');
}
