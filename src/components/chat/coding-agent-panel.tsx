'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CornerDownLeft, LoaderCircle, MessageSquarePlus, Send, TerminalSquare, Wrench, X } from 'lucide-react';
import { useDashboard } from '@/store';
import { timeAgo } from '@/lib/utils';
import type { ChatMessage } from '@/types';

type PanelVariant = 'workspace' | 'popup';

type CliModuleOption = {
	id: string;
	label: { en: string; de: string };
	hint: { en: string; de: string };
};

const CLI_MODULES: CliModuleOption[] = [
	{
		id: 'workspace',
		label: { en: 'Workspace', de: 'Workspace' },
		hint: { en: 'Files, app structure, diff planning', de: 'Dateien, App-Struktur, Diff-Planung' },
	},
	{
		id: 'ssh',
		label: { en: 'SSH Access', de: 'SSH-Zugriff' },
		hint: { en: 'Remote server checks and deploy tasks', de: 'Remote-Server-Checks und Deploy-Aufgaben' },
	},
	{
		id: 'cli',
		label: { en: 'CLI Runtime', de: 'CLI-Runtime' },
		hint: { en: 'OpenClaw/admin CLI flows and command design', de: 'OpenClaw-/Admin-CLI-Flows und Command-Design' },
	},
	{
		id: 'github',
		label: { en: 'GitHub', de: 'GitHub' },
		hint: { en: 'Repo sync, actions, deploy status', de: 'Repo-Sync, Actions, Deploy-Status' },
	},
	{
		id: 'automation',
		label: { en: 'Automation', de: 'Automation' },
		hint: { en: 'Cron, approval chains, workflow logic', de: 'Cron, Freigaben, Workflow-Logik' },
	},
	{
		id: 'ui',
		label: { en: 'Web UI', de: 'Web-UI' },
		hint: { en: 'UX, layout, chat polish, responsiveness', de: 'UX, Layout, Chat-Polish, Responsiveness' },
	},
];

function copy(language: 'en' | 'de') {
	return language === 'de'
		? {
				title: 'Coding Agent Chat',
				subtitle: 'Direkte Chat-Steuerung für den Coding-Agenten mit CLI- und SSH-Kontext.',
				popupTitle: 'Coding Agent',
				emptyTitle: 'Bereit für die nächste Aufgabe',
				emptyBody: 'Schreibe eine Aufgabe, drücke Enter zum Senden oder nutze die CLI-Module als Kontext für präzisere Antworten.',
				inputLabel: 'Agenten-Nachricht',
				inputPlaceholder: 'Schreibe an den Coding-Agenten … Enter = senden, Shift+Enter = neue Zeile',
				cliTitle: 'CLI-Module',
				cliHint: 'Wähle Module, die der Agent berücksichtigen soll, und bearbeite bei Bedarf den CLI-Draft.',
				draftLabel: 'CLI-Draft',
				draftPlaceholder: 'z. B. openclaw agent --agent main --message "Status prüfen"',
				send: 'Senden',
				sending: 'Sende …',
				open: 'Agent öffnen',
				close: 'Schließen',
				refresh: 'Neu laden',
				enterHint: 'Enter sendet',
				errorFallback: 'Agentenantwort konnte nicht geladen werden.',
			}
		: {
				title: 'Coding Agent Chat',
				subtitle: 'Direct coding-agent chat with CLI and SSH context attached.',
				popupTitle: 'Coding Agent',
				emptyTitle: 'Ready for the next task',
				emptyBody: 'Write a task, press Enter to send, or use CLI modules for more precise agent guidance.',
				inputLabel: 'Agent message',
				inputPlaceholder: 'Write to the coding agent… Enter = send, Shift+Enter = newline',
				cliTitle: 'CLI Modules',
				cliHint: 'Choose which modules the agent should consider and edit the CLI draft if needed.',
				draftLabel: 'CLI Draft',
				draftPlaceholder: 'e.g. openclaw agent --agent main --message "Check current status"',
				send: 'Send',
				sending: 'Sending…',
				open: 'Open agent',
				close: 'Close',
				refresh: 'Refresh',
				enterHint: 'Enter sends',
				errorFallback: 'Agent response could not be loaded.',
			};
}

function isAgentMessage(message: ChatMessage) {
	return message.from_agent === 'orchestrator';
}

export function CodingAgentPanel({ variant = 'workspace' }: { variant?: PanelVariant }) {
	const language = useDashboard((state) => state.language);
	const coding = useDashboard((state) => state.coding);
	const updateCoding = useDashboard((state) => state.updateCoding);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const messagesRef = useRef<HTMLDivElement>(null);
	const ui = copy(language);
	const compact = variant === 'popup';

	const selectedModules = coding.selectedCliModules || [];
	const cliDraft = coding.cliCommandDraft || '';

	const localizedModules = useMemo(() => CLI_MODULES.map((module) => ({
		...module,
		title: module.label[language],
		description: module.hint[language],
	})), [language]);

	const loadMessages = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetch('/api/mission-control/chat?mode=orchestrator&limit=80', { cache: 'no-store' });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || ui.errorFallback);
			setMessages(Array.isArray(data.messages) ? data.messages : []);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : ui.errorFallback);
		} finally {
			setLoading(false);
		}
	}, [ui.errorFallback]);

	useEffect(() => {
		void loadMessages();
	}, [loadMessages]);

	useEffect(() => {
		const timer = window.setInterval(() => {
			void loadMessages();
		}, 10_000);
		return () => window.clearInterval(timer);
	}, [loadMessages]);

	useEffect(() => {
		const node = messagesRef.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [messages, loading]);

	const toggleCliModule = (id: string) => {
		const next = selectedModules.includes(id)
			? selectedModules.filter((item) => item !== id)
			: [...selectedModules, id];
		updateCoding({ selectedCliModules: next });
	};

	const handleSend = useCallback(async () => {
		const prompt = coding.promptDraft.trim();
		if (!prompt || sending) return;
		setSending(true);
		setError(null);
		try {
			const contextBlocks: string[] = [];
			if (selectedModules.length > 0) {
				contextBlocks.push(`[cli-modules]\n${selectedModules.join(', ')}`);
			}
			if (cliDraft.trim()) {
				contextBlocks.push(`[cli-command-draft]\n${cliDraft.trim()}`);
			}
			const content = [...contextBlocks, prompt].join('\n\n');

			const response = await fetch('/api/mission-control/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode: 'orchestrator', content }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || ui.errorFallback);

			updateCoding({ promptDraft: '' });
			await loadMessages();
		} catch (err) {
			setError(err instanceof Error ? err.message : ui.errorFallback);
		} finally {
			setSending(false);
		}
	}, [cliDraft, coding.promptDraft, loadMessages, selectedModules, sending, ui.errorFallback, updateCoding]);

	const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	};

	return (
		<div className={`rounded-2xl border border-border/40 bg-background/80 ${compact ? 'p-4' : 'p-5'} shadow-[0_10px_40px_rgba(3,8,20,0.18)]`}>
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Bot size={16} className="text-primary" />
						{compact ? ui.popupTitle : ui.title}
					</div>
					<p className="mt-1 text-xs text-muted-foreground">{ui.subtitle}</p>
				</div>
				<button className="btn btn-ghost btn-xs" onClick={() => void loadMessages()}>
					<MessageSquarePlus size={12} /> {ui.refresh}
				</button>
			</div>

			<div ref={messagesRef} className={`mt-4 rounded-2xl border border-border/40 bg-[#07101f] px-3 py-3 ${compact ? 'h-56' : 'h-80'} overflow-y-auto space-y-3`}>
				{loading && messages.length === 0 ? (
					<div className="flex items-center gap-2 text-xs text-slate-300">
						<LoaderCircle size={14} className="animate-spin" /> {ui.sending}
					</div>
				) : messages.length === 0 ? (
					<div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-200">
						<div className="font-medium">{ui.emptyTitle}</div>
						<div className="mt-1 text-xs text-slate-400">{ui.emptyBody}</div>
					</div>
				) : (
					messages.map((message) => {
						const fromAgent = isAgentMessage(message);
						return (
							<div key={message.id} className={`flex ${fromAgent ? 'justify-start' : 'justify-end'}`}>
								<div className={`max-w-[92%] rounded-2xl border px-3 py-2 ${fromAgent ? 'border-primary/20 bg-primary/10 text-slate-100' : 'border-slate-700 bg-slate-900 text-slate-100'}`}>
									<div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400">
										<span>{fromAgent ? 'agent' : message.from_agent}</span>
										<span>•</span>
										<span>{timeAgo(new Date(message.created_at * 1000).toISOString())}</span>
									</div>
									<div className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.content}</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			<div className="mt-4 space-y-3">
				<div>
					<div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
						<TerminalSquare size={13} className="text-primary" /> {ui.cliTitle}
					</div>
					<div className="mb-2 text-[11px] text-muted-foreground">{ui.cliHint}</div>
					<div className="flex flex-wrap gap-2">
						{localizedModules.map((module) => {
							const active = selectedModules.includes(module.id);
							return (
								<button
									key={module.id}
									type="button"
									onClick={() => toggleCliModule(module.id)}
									className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/40 bg-muted/10 text-muted-foreground hover:text-foreground'}`}
									title={module.description}
								>
									{module.title}
								</button>
							);
						})}
					</div>
				</div>

				<label className="block space-y-2">
					<span className="flex items-center gap-2 text-xs font-medium text-foreground">
						<Wrench size={13} className="text-primary" /> {ui.draftLabel}
					</span>
					<textarea
						value={cliDraft}
						onChange={(event) => updateCoding({ cliCommandDraft: event.target.value })}
						placeholder={ui.draftPlaceholder}
						className={`w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs ${compact ? 'min-h-[88px]' : 'min-h-[104px]'}`}
					/>
				</label>

				<label className="block space-y-2">
					<span className="flex items-center justify-between gap-3 text-xs font-medium text-foreground">
						<span>{ui.inputLabel}</span>
						<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
							<CornerDownLeft size={11} /> {ui.enterHint}
						</span>
					</span>
					<textarea
						value={coding.promptDraft}
						onChange={(event) => updateCoding({ promptDraft: event.target.value })}
						onKeyDown={handlePromptKeyDown}
						placeholder={ui.inputPlaceholder}
						className={`w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm ${compact ? 'min-h-[100px]' : 'min-h-[140px]'}`}
					/>
				</label>

				{error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div> : null}

				<div className="flex items-center justify-end gap-2">
					<button className="btn btn-primary btn-sm" onClick={() => void handleSend()} disabled={!coding.promptDraft.trim() || sending}>
						{sending ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />} {sending ? ui.sending : ui.send}
					</button>
				</div>
			</div>
		</div>
	);
}

export function CodingAgentDock() {
	const language = useDashboard((state) => state.language);
	const open = useDashboard((state) => state.coding.agentDockOpen);
	const updateCoding = useDashboard((state) => state.updateCoding);
	const ui = copy(language);

	return (
		<div className="fixed bottom-16 left-3 z-50 md:bottom-5 md:left-[calc(var(--nav-width)+12px)]">
			{open && (
				<div className="mb-3 w-[min(420px,calc(100vw-1.5rem))] max-w-[420px]">
					<div className="mb-2 flex justify-end">
						<button
							type="button"
							className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/90 px-3 py-1 text-[11px] text-muted-foreground shadow-lg backdrop-blur"
							onClick={() => updateCoding({ agentDockOpen: false })}
						>
							<X size={12} /> {ui.close}
						</button>
					</div>
					<CodingAgentPanel variant="popup" />
				</div>
			)}

			<button
				type="button"
				onClick={() => updateCoding({ agentDockOpen: !open, activeSection: 'agent' })}
				className="group flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(45,120,255,0.35)] transition-transform hover:scale-[1.03]"
				title={ui.open}
			>
				<Bot size={20} />
			</button>
		</div>
	);
}
