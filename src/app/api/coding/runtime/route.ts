import { NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/api-auth';
import { getAgents, getOpenClawModelCatalog } from '@/lib/agent-config';
import { getDefaultInstanceId, getInstance } from '@/lib/instances';
import { runLeadsAdmin } from '@/lib/command';

export const dynamic = 'force-dynamic';

function getInstanceId(request: Request) {
	try {
		const url = new URL(request.url);
		return url.searchParams.get('instance') || url.searchParams.get('namespace') || undefined;
	} catch {
		return undefined;
	}
}

export async function GET(request: Request) {
	const auth = requireApiUser(request);
	if (auth) return auth;

	const instanceId = getInstanceId(request) || getDefaultInstanceId();
	const instance = getInstance(instanceId);
	const agents = getAgents(instance.id);
	const { providers, models } = getOpenClawModelCatalog(instance.id);

	let runtime = {
		connected: false,
		status: 'offline' as 'healthy' | 'degraded' | 'offline',
		message: 'OpenClaw runtime unavailable.',
	};

	try {
		const result = await runLeadsAdmin(['agents', 'list', '--json'], { timeoutMs: 20_000 });
		if (result.code === 0) {
			runtime = {
				connected: true,
				status: 'healthy',
				message: `OpenClaw runtime connected with ${agents.length} discovered agents.`,
			};
		} else {
			runtime = {
				connected: false,
				status: 'degraded',
				message: result.stderr.trim() || result.stdout.trim() || 'OpenClaw responded with a non-zero status.',
			};
		}
	} catch (error) {
		runtime = {
			connected: false,
			status: 'offline',
			message: error instanceof Error ? error.message : String(error),
		};
	}

	return NextResponse.json({
		instance: { id: instance.id, label: instance.label },
		runtime,
		agents: agents.map((agent) => ({
			id: agent.id,
			name: agent.name,
			emoji: agent.emoji,
			role: agent.role,
			model: agent.model,
			fallbacks: agent.fallbacks,
			workspace: agent.workspace,
			tools: agent.tools,
		})),
		providers,
		models,
	});
}