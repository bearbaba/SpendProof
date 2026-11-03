import assert from 'node:assert/strict';
import test from 'node:test';
import { parseServAssessment } from '../lib/serv.ts';

const valid = {
  summary:'This purchase fits the budget but merchant pricing needs independent verification.',
  risk:'medium',
  recommendation:'REVIEW',
  concerns:['Quoted price unverified'],
  evidenceGaps:['Live catalog lookup is missing'],
};

test('valid SERV assessment is accepted, normalized and typed',()=>{
  const parsed=parseServAssessment(JSON.stringify(valid));
  assert.deepEqual(parsed,{
    summary:valid.summary,
    risk:'medium',
    recommendation:'REVIEW',
    concerns:valid.concerns,
    evidenceGaps:valid.evidenceGaps,
  });
});

test('markdown JSON code fences are accepted without relaxing checks',()=>{
  const fence=String.fromCharCode(96).repeat(3);
  const parsed=parseServAssessment(fence+'json\n'+JSON.stringify(valid)+'\n'+fence);
  assert.equal(parsed.risk,'medium');
});

test('wrong, missing or ambiguous decisions fail closed',()=>{
  for(const x of [
    {...valid,recommendation:'APPROVE'},
    {...valid,recommendation:''},
    {...valid,risk:'none'},
    {...valid,summary:'okay'},
    {...valid,evidenceGaps:null},
    {...valid,concerns:'nothing'},
    {...valid,concerns:[1]},
    {...valid,evidenceGaps:Array(9).fill('x')},
    {...valid,concerns:['']},
  ]) assert.throws(()=>parseServAssessment(JSON.stringify(x)));
});

test('non-JSON, array root, giant payload and fake success text are rejected',()=>{
  for(const t of ['APPROVED!', '{"ok":true}', '[]', '{}', '{}'.repeat(6000)]) {
    assert.throws(()=>parseServAssessment(t));
  }
});

test('DENY and high risk are representable without treating them as approval',()=>{
  const r=parseServAssessment(JSON.stringify({...valid,risk:'high',recommendation:'DENY'}));
  assert.equal(r.recommendation,'DENY');
  assert.equal(r.risk,'high');
});
