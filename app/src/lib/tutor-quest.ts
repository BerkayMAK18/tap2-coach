import { z } from 'zod';

export const questSchema = z.object({
  task: z.string().trim().min(1),
  material: z.string(),
});
export type TutorQuest = z.infer<typeof questSchema>;
const marker = /\n*```tutor-quest\n([\s\S]*?)\n```/;

/** Store the current task with its message, without a separate mutable record. */
export function withQuest(reply: string, quest?: TutorQuest) {
  return quest ? `${reply}\n\n\`\`\`tutor-quest\n${JSON.stringify(quest)}\n\`\`\`` : reply;
}

export function readQuest(content: string) {
  const match = marker.exec(content);
  if (!match) return { reply: content, quest: null };
  try {
    const result = questSchema.safeParse(JSON.parse(match[1]));
    if (result.success) return { reply: content.replace(marker, '').trim(), quest: result.data };
  } catch { /* Older or incomplete messages remain readable. */ }
  return { reply: content, quest: null };
}

/** Presentation-only separation: never rewrite historical messages or evidence. */
export function pedagogicalReply(content: string) {
  const { reply, quest } = readQuest(content);
  let text = reply;
  if (quest) {
    for (const duplicate of [quest.task, quest.material]) {
      if (duplicate.trim()) text = text.split(duplicate.trim()).join('');
    }
  }
  const blocks = text.split(/\n\s*\n/);
  return blocks.filter((block, index) => {
    const plain = block.replace(/[*_#]/g, '').trim();
    // Legacy assignments stay intact in the Quest panel. Retain the teaching
    // paragraphs but omit explicit tasks, assessment questions and source tables.
    if (/^(?:Aufgabe(?:nstellung)?|Deine Aufgabe|Nächste Verständnisfrage|Verständnisfrage|Ausgangstabelle)\s*:/i.test(plain)) return false;
    if (/^(?:Schreibe|Vervollständige|Bestimme|Nenne|Beschreibe|Erläutere|Beurteile|Erstelle|Formuliere|Zerlege|Ordne|Welche|Welcher|Welches|Was|Wie|Warum)\b/.test(plain) && (/[?]\s*$/.test(plain) || /^(?:Schreibe|Vervollständige|Bestimme|Nenne|Beschreibe|Erläutere|Beurteile|Erstelle|Formuliere|Zerlege|Ordne)\b/.test(plain))) return false;
    if (!quest && /^\s*\|/.test(block) && /\|\s*:?-{3,}/.test(block)) return false;
    if (!quest && index === blocks.length - 1 && /\?\s*$/.test(plain)) return false;
    return plain.length > 0;
  }).join('\n\n').trim();
}

export function learnerReply(content: string) {
  return content.startsWith('Aufgabe:\n') && content.includes('\n\nMeine Antwort:')
    ? content.slice(content.indexOf('\n\nMeine Antwort:') + '\n\nMeine Antwort:'.length).trim()
    : content;
}

export function currentQuest(messages: { id: string; role: string; content: string }[]) {
  for (const message of [...messages].reverse()) {
    if (message.role !== 'assistant') continue;
    const parsed = readQuest(message.content);
    if (parsed.quest) return { ...parsed.quest, messageId: message.id, legacy: false };
    // Existing conversations have no structured task: preserve the full prompt,
    // rather than guessing and accidentally dropping a table or question.
    if (message.content.trim()) {
      const original = messages.find(m => m.role === 'user' && m.content.startsWith('Aufgabe:\n'));
      const context = original?.content.split('\n\nMeine Antwort:')[0].replace(/^Aufgabe:\n/, '') ?? '';
      return { task: parsed.reply, material: context, messageId: message.id, legacy: true };
    }
  }
  return null;
}