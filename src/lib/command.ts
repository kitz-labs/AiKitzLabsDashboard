import http from 'node:http';
import { spawn } from 'node:child_process';

const ADMIN_CLI = process.env.KITZ_ADMIN_CLI || process.env.OPENCLAW_BIN || 'openclaw';
const OPENCLAW_CONTAINER = process.env.KITZ_OPENCLAW_CONTAINER?.trim() || '';
const DOCKER_SOCKET = process.env.KITZ_OPENCLAW_DOCKER_SOCKET?.trim() || '/var/run/docker.sock';
const DEFAULT_AGENT = process.env.KITZ_OPENCLAW_DEFAULT_AGENT?.trim() || 'main';

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

async function dockerSocketRequest(path: string, init?: { method?: string; body?: unknown; timeoutMs?: number }) {
  return await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const request = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path: `/v1.41${path}`,
        method: init?.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({ statusCode: response.statusCode || 0, body });
        });
      },
    );

    request.on('error', reject);
    request.setTimeout(init?.timeoutMs || 120_000, () => {
      request.destroy(new Error('Docker socket request timed out'));
    });
    if (init?.body !== undefined) {
      request.write(JSON.stringify(init.body));
    }
    request.end();
  });
}

async function runInOpenClawContainer(args: string[], opts: { timeoutMs?: number } = {}): Promise<CommandResult> {
  if (!OPENCLAW_CONTAINER) {
    throw new Error('KITZ_OPENCLAW_CONTAINER is not configured');
  }

  const create = await dockerSocketRequest(`/containers/${encodeURIComponent(OPENCLAW_CONTAINER)}/exec`, {
    method: 'POST',
    body: {
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: ['openclaw', ...args],
    },
    timeoutMs: opts.timeoutMs,
  });
  if (create.statusCode >= 400) {
    throw new Error(create.body || `Docker exec create failed (${create.statusCode})`);
  }

  const { Id } = JSON.parse(create.body) as { Id?: string };
  if (!Id) {
    throw new Error('Docker exec did not return an exec id');
  }

  const start = await dockerSocketRequest(`/exec/${Id}/start`, {
    method: 'POST',
    body: { Detach: false, Tty: true },
    timeoutMs: opts.timeoutMs,
  });
  const inspect = await dockerSocketRequest(`/exec/${Id}/json`, {
    method: 'GET',
    timeoutMs: opts.timeoutMs,
  });
  const execInfo = inspect.body ? (JSON.parse(inspect.body) as { ExitCode?: number }) : {};
  return {
    stdout: execInfo.ExitCode === 0 ? start.body : '',
    stderr: execInfo.ExitCode === 0 ? '' : start.body,
    code: execInfo.ExitCode ?? null,
  };
}

function runLocally(args: string[], opts: { timeoutMs?: number } = {}) {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(ADMIN_CLI, args, { shell: false });

    let stdout = '';
    let stderr = '';
    let timer: NodeJS.Timeout | undefined;

    if (opts.timeoutMs) {
      timer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    }

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

function extractAgentResponse(result: CommandResult): { response: string; sessionId?: string } {
  try {
    const data = JSON.parse(result.stdout) as {
      response?: string;
      content?: string;
      sessionId?: string;
      result?: {
        payloads?: Array<{ text?: string | null }>;
        meta?: { agentMeta?: { sessionId?: string } };
      };
    };
    const payloadText = Array.isArray(data.result?.payloads)
      ? data.result.payloads.map((payload) => payload.text?.trim()).filter(Boolean).join('\n\n')
      : '';
    return {
      response: data.response || data.content || payloadText || result.stdout.trim() || result.stderr.trim(),
      sessionId: data.sessionId || data.result?.meta?.agentMeta?.sessionId,
    };
  } catch {
    return { response: result.stdout.trim() || result.stderr.trim() };
  }
}

/**
 * Run a leads-admin CLI command (wraps openclaw with leads env).
 * Resolves on exit; rejects on spawn error or non-zero exit.
 */
export function runLeadsAdmin(
  args: string[],
  opts: { timeoutMs?: number } = {},
): Promise<CommandResult> {
  if (OPENCLAW_CONTAINER) {
    return runInOpenClawContainer(args, opts);
  }

  return runLocally(args, opts).catch((error) => {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT' && OPENCLAW_CONTAINER) {
      return runInOpenClawContainer(args, opts);
    }
    throw error;
  });
}

/**
 * Send a message to an agent via the gateway.
 * Uses `leads-admin agent --agent <id> --message <text> --json`
 * Returns the agent's response text.
 */
export async function sendAgentMessage(
  agentId: string,
  message: string,
  sessionId?: string,
): Promise<{ response: string; sessionId?: string }> {
  const args = [
    'agent',
    '--agent', agentId,
    '--message', message,
    '--json',
  ];
  if (sessionId) {
    args.push('--session-id', sessionId);
  }

  const result = await runLeadsAdmin(args, { timeoutMs: 120_000 });
  return extractAgentResponse(result);
}

/**
 * Send a message to the default orchestrator routing via leads-admin.
 * Uses `openclaw agent --agent <default> --message <text> --json`.
 */
export async function sendOrchestratorMessage(
  message: string,
  sessionId?: string,
): Promise<{ response: string; sessionId?: string }> {
  const args = [
    'agent',
    '--agent', DEFAULT_AGENT,
    '--message', message,
    '--json',
  ];
  if (sessionId) {
    args.push('--session-id', sessionId);
  }

  const result = await runLeadsAdmin(args, { timeoutMs: 120_000 });
  return extractAgentResponse(result);
}
