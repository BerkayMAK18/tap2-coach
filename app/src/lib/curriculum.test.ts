import { describe, expect, it } from 'vitest';
import { PARTS, groupOf, learningPlan, codeLanguage } from './curriculum';
import type { Content } from './tap2';
const content: Content = { examDay: '2026-11-25', sqlSchema: '', exercises: [], topics: [
  {id:'T01', name:'Algorithmen', part:'Teil 2', prio:'Muss'},
  {id:'T09', name:'Web', part:'Teil 1', prio:'Wichtig'},
], items: [
  {id:'a', topic:'T01', type:'card', q:'',a:'',note:''},
  {id:'b', topic:'T09', type:'card', q:'',a:'',note:''},
] };
describe('FIAE plan', () => {
  it('groups Teil 1, Teil 2, Beides, SoWi in the requested order', () => { expect(PARTS).toEqual(['Teil 1','Teil 2','Beides','SoWi']); expect(groupOf('Teil 1 + 2')).toBe('Beides'); });
  it('puts unmastered Muss topics ahead of should topics', () => { expect(learningPlan(content,[],new Date('2026-11-12')).ordered.map(t=>t.id)).toEqual(['T01','T09']); });
  it('does not claim unassessed topics are mastered', () => { expect(learningPlan(content,[],new Date('2026-11-12')).topics[0].status).toBe('Stand noch offen'); });
  it('updates priority from actual recorded mastery', () => { expect(learningPlan(content,[{item_id:'a',topic:'T01',box:3,due:'2026-11-20',correct:3,wrong:0}],new Date('2026-11-12')).ordered[0].id).toBe('T09'); });
  it('ends before the 25 November exam with a consolidation day', () => { const p=learningPlan(content,[],new Date('2026-11-12')); expect(p.calendar.at(-1)).toMatchObject({date:'2026-11-24',final:true}); expect(p.calendar.flatMap(d=>d.topics).length).toBe(2); });
  it('uses Python for algorithm implementations and SQL for queries', () => { expect(codeLanguage('T01','Entwickeln Sie einen Algorithmus')).toBe('python'); expect(codeLanguage('T02','Schreiben Sie SELECT')).toBe('sql'); expect(codeLanguage('T11','Erkläre Kündigung')).toBeNull(); });
  it('puts data modelling before dependent SQL without dropping topics', () => {
    const c = {...content,topics:[{id:'T02',name:'SQL',part:'Teil 2',prio:'Muss'},{id:'T03',name:'Datenmodell',part:'Teil 1 + 2',prio:'Muss'}]};
    expect(learningPlan(c,[],new Date('2026-11-12')).ordered.map(t=>t.id)).toEqual(['T03','T02']);
  });
});