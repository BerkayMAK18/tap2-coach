import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const learningSourcesQuery = () => queryOptions({
  queryKey: ['learning-sources'],
  queryFn: async () => {
    const { data, error } = await supabase.from('learning_sources').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
});