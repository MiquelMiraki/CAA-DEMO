import OpenAI from 'openai';
import { executeQuery, listGoldTables, getTableSchema } from './snowflake-client';
import { buildSchemaContext, SYSTEM_PROMPT } from './schema-context';

const MAX_TOOL_ROUNDS = 8;

// Build tools with dynamic schema name
function buildTools(schema: string): OpenAI.ChatCompletionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'execute_sql',
        description: `Execute a SQL query on the Snowflake ${schema} schema. Use this to retrieve data for analysis. Always query from ${schema}.* tables. Returns up to 50 rows.`,
        parameters: {
          type: 'object',
          properties: {
            sql: { type: 'string', description: `The SQL query to execute. Must use ${schema} schema (e.g., SELECT * FROM ${schema}.CAMPAIGN_DAILY)` },
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
        description: `List all available tables in the ${schema} schema with row counts.`,
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_table_schema',
        description: `Get the column names and types for a specific ${schema} table.`,
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
}

async function handleToolCall(toolName: string, toolInput: Record<string, unknown>, schema: string): Promise<string> {
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
      const tables = await listGoldTables(schema);
      return JSON.stringify({ tables });
    }

    case 'get_table_schema': {
      const tableName = toolInput.table_name as string;
      const tableSchema = await getTableSchema(tableName, schema);
      return JSON.stringify({ columns: tableSchema.rows });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SqlQuery {
  sql: string;
  purpose: string;
}

export async function chat(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  schema?: string,
): Promise<{ response: string; history: ChatMessage[]; queriesExecuted: number; sqlQueries: SqlQuery[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI({ apiKey });

  const activeSchema = schema || process.env.SNOWFLAKE_DEFAULT_SCHEMA || 'GOLD';
  const systemPrompt = `${SYSTEM_PROMPT}\n\n${buildSchemaContext(activeSchema)}`;

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
  const sqlQueries: SqlQuery[] = [];

  const tools = buildTools(activeSchema);

  // Agentic loop: GPT calls tools, we execute them, repeat until GPT gives final answer
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages,
      tools,
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
        if (fn.name === 'execute_sql') {
          sqlQueries.push({ sql: args.sql, purpose: args.purpose || '' });
        }
        const result = await handleToolCall(fn.name, args, activeSchema);
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

      return { response: textContent, history: updatedHistory, queriesExecuted, sqlQueries };
    }
  }

  throw new Error('Agent exceeded maximum tool rounds');
}
