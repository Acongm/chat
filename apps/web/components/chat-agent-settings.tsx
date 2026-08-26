'use client';

import { useEffect, useState } from 'react';
import {
  getUserSettings,
  updateUserSettings,
  useSession,
  type AgentSkill,
} from '@acongm/auth-client';
import { Button } from '@/components/ui/button';

const DEFAULT_PROMPT_MAX_LENGTH = 2000;
const AGENT_SKILLS_MAX_COUNT = 8;

function createSkillDraft(): AgentSkill {
  return {
    id: `skill-${Date.now().toString(36)}`,
    name: '',
    content: '',
    enabled: true,
  };
}

function skillsForSave(skills: AgentSkill[]): AgentSkill[] {
  return skills
    .map((skill) => ({
      ...skill,
      name: skill.name.trim(),
      content: skill.content.trim(),
    }))
    .filter((skill) => skill.name);
}

async function resolveAccessToken(
  accessToken: string | null | undefined,
  ensureGuestAuth: () => Promise<{ access_token?: string } | null>,
): Promise<string | null> {
  if (accessToken) return accessToken;
  const session = await ensureGuestAuth();
  return session?.access_token ?? null;
}

export function ChatAgentSettings() {
  const { accessToken, ensureGuestAuth } = useSession();
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    void getUserSettings({ accessToken })
      .then((settings) => {
        if (cancelled) return;
        setDefaultPrompt(settings.chat?.defaultPrompt ?? '');
        setSkills(settings.chat?.skills ?? []);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Agent 配置加载失败。');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function saveAgentConfig() {
    const token = await resolveAccessToken(accessToken, ensureGuestAuth);
    if (!token) {
      setError('无法准备访客会话。');
      return;
    }
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const nextSkills = skillsForSave(skills);
      const result = await updateUserSettings(
        {
          defaultPrompt: defaultPrompt.trim() ? defaultPrompt.trim() : null,
          skills: nextSkills.length ? nextSkills : null,
        },
        { accessToken: token },
      );
      setDefaultPrompt(result.settings.chat?.defaultPrompt ?? '');
      setSkills(result.settings.chat?.skills ?? []);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Agent 配置保存失败。');
    } finally {
      setBusy(false);
    }
  }

  function updateSkill(id: string, patch: Partial<AgentSkill>) {
    setSkills((current) =>
      current.map((skill) => (skill.id === id ? { ...skill, ...patch } : skill)),
    );
  }

  const canAddSkill = skills.length < AGENT_SKILLS_MAX_COUNT;

  return (
    <details className="space-y-2 rounded-md px-1 py-1">
      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-accent-foreground">
        Agent 配置
      </summary>
      <div className="space-y-3 pt-1">
        <label className="block space-y-1 text-xs">
          <span className="font-medium text-foreground">默认系统提示词</span>
          <textarea
            id="chat-default-prompt"
            value={defaultPrompt}
            onChange={(event) => setDefaultPrompt(event.target.value)}
            maxLength={DEFAULT_PROMPT_MAX_LENGTH}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="例如：回答尽量简洁。"
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Skills</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={!canAddSkill}
              onClick={() => setSkills((current) => [...current, createSkillDraft()])}
            >
              添加技能
            </Button>
          </div>
          {skills.length === 0 ? (
            <p className="text-xs text-muted-foreground">还没有技能。可添加与 Agent 平台类似的指令技能。</p>
          ) : null}
          {skills.map((skill) => (
            <SkillEditor
              key={skill.id}
              skill={skill}
              onChange={(patch) => updateSkill(skill.id, patch)}
              onRemove={() =>
                setSkills((current) => current.filter((item) => item.id !== skill.id))
              }
            />
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={busy}
          onClick={() => void saveAgentConfig()}
        >
          {busy ? '保存中…' : '保存 Agent 配置'}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {saved ? <p className="text-xs text-muted-foreground">已保存。</p> : null}
      </div>
    </details>
  );
}

type SkillEditorProps = {
  skill: AgentSkill;
  onChange: (patch: Partial<AgentSkill>) => void;
  onRemove: () => void;
};

function SkillEditor({ skill, onChange, onRemove }: SkillEditorProps) {
  return (
    <div className="space-y-1 rounded-md border border-input p-2">
      <input
        aria-label="技能名称"
        value={skill.name}
        onChange={(event) => onChange({ name: event.target.value })}
        maxLength={80}
        placeholder="例如：code-review"
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <textarea
        aria-label="技能内容"
        value={skill.content}
        onChange={(event) => onChange({ content: event.target.value })}
        maxLength={2000}
        rows={2}
        placeholder="技能指令…"
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={skill.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          启用
        </label>
        <Button type="button" variant="ghost" size="xs" onClick={onRemove}>
          删除
        </Button>
      </div>
    </div>
  );
}
