import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { storagePathSchema } from './learn-types';

export const sourceInput = z.object({
  title: z.string().trim().min(1).max(200),
  topic_id: z.string().regex(/^T(0[1-9]|1[0-9])$/).nullable(),
  content: z.string().trim().max(40000),
  // Datei muss im eigenen Ordner liegen (<user_id>/<name>); Besitz wird im Handler gegen die Nutzer-ID geprüft.
  file_path: storagePathSchema.nullable(),
  file_name: z.string().max(200).nullable(),
  file_type: z.string().max(100).nullable(),
}).refine(s => !!s.content || !!s.file_path, 'Füge einen Text oder eine Datei hinzu.');

export const saveLearningSource = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof sourceInput>) => sourceInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.file_path && !data.file_path.startsWith(`${context.userId}/`)) throw new Error('Diese Datei gehört nicht zu dir.');
    if (data.file_path) {
      const { error } = await context.supabase.storage.from('attachments').download(data.file_path);
      if (error) throw new Error('Die Datei wurde nicht gespeichert. Lade sie erneut hoch.');
    }
    const { data: row, error } = await context.supabase.from('learning_sources').insert({ ...data, user_id: context.userId }).select('id').single();
    if (error) throw error;
    return row;
  });