'use client';

import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2,
  ChevronRight, ClipboardCheck, Code2, Copy, Download, ExternalLink,
  FileCheck2, Fingerprint, FlaskConical, Globe2, Info, LayoutDashboard,
  LoaderCircle, LockKeyhole, Play, ReceiptText, Shield, ShieldAlert,
  ShieldCheck, Sparkles, Wallet, XCircle, Zap
} from 'lucide-react';
import { evaluate, type Decision, type Proposal, type ServAssessment } from '../lib/policy';
import { buildKiteSteps, evaluateCatalogReview, type CatalogReview } from '../lib/kite';
import type { AuditAttestation } from '../lib/attestation';

type Area = 'workspace'|'audit'|'passport';
type CaseId = 'within'|'over'|'missing';
type Report = {
  createdAt: string; mode: 'local-policy'|'serv-live'|'policy';
  proposal: Proposal; policy: Decision; serv: ServAssessment|null;
  paymentExecuted: false; model?: string; attestation?: AuditAttestation|null;
};

const cases: Record<CaseId, { label:string; sub:string; proposal:Proposal }> = {
  within: {
    label:'Within budget', sub:'Requires manual verification',
    proposal:{
      task:'Retrieve one current weather dataset for a Tokyo travel report.',
      provider:'Sample Weather API (illustrative)',
      endpoint:'https://weather.example.org/api/current',
      evidenceUrl:'https://weather.example.org/pricing',
      amountUsd:0.25, budgetUsd:1, perTxUsd:0.5, remainingUsd:0.75,
      method:'GET', supportsX402:true,
    },
  },
  over: {
    label:'Over spending cap', sub:'Should block immediately',
    proposal:{
      task:'Retrieve one current weather dataset for a Tokyo travel report.',
      provider:'Sample Weather API (illustrative)',
      endpoint:'https://weather.example.org/api/current',
      evidenceUrl:'https://weather.example.org/pricing',
      amountUsd:1.25, budgetUsd:1, perTxUsd:0.5, remainingUsd:0.75,
      method:'GET', supportsX402:true,
    },
  },
  missing: {
    label:'Missing evidence', sub:'Should block before reasoning',
    proposal:{
      task:'Retrieve one current weather dataset for a Tokyo travel report.',
      provider:'Sample Weather API (illustrative)',
      endpoint:'https://weather.example.org/api/current',
      evidenceUrl:'',
      amountUsd:0.25, budgetUsd:1, perTxUsd:0.5, remainingUsd:0.75,
      method:'GET', supportsX402:true,
    },
  },
};

function usd(value: number) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(value)?value:0);
}
function BrandMark({ small=false }:{small?:boolean}) {
  return <span className={'brand-mark'+(small?' small':'')} aria-hidden="true">
    <ShieldCheck size={small?18:23} strokeWidth={2.3}/>
  </span>;
}
function Dot({ ok }:{ok:boolean}) {
  return <span className={'state-dot '+(ok?'good':'bad')} aria-hidden="true"/>;
}

export default function Page() {
  const [area,setArea] = useState<Area>('workspace');
  const [caseId,setCaseId] = useState<CaseId>('within');
  const [proposal,setProposal] = useState<Proposal>(cases.within.proposal);
  const [report,setReport] = useState<Report|null>(null);
  const [busy,setBusy] = useState(false);
  const [access,setAccess] = useState('');
  const [error,setError] = useState('');
  const [copied,setCopied] = useState('');
  const [notifications,setNotifications] = useState('');
  const [verification,setVerification] = useState<'idle'|'checking'|'verified'|'invalid'>('idle');
  const [catalogReview,setCatalogReview] = useState<CatalogReview>({
    serviceId:'', endpoint:'', priceUsd:0, userConfirmed:false,
  });
  const policy = useMemo(()=>evaluate(proposal),[proposal]);
  const passed = policy.checks.filter(c=>c.passed).length;
  const servApproved = Boolean(report?.mode==='serv-live' && report.policy.verdict==='REVIEW' && report.serv?.recommendation==='REVIEW' && report.serv.risk!=='high' && report.proposal.method==='GET' && report.attestation);
  const catalogChecks = useMemo(()=>evaluateCatalogReview(proposal,catalogReview),[proposal,catalogReview]);
  const catalogReady = catalogChecks.every(check=>check.passed);
  const canHandoff = servApproved && catalogReady;
  const commands = useMemo(()=>buildKiteSteps(proposal,catalogReview,servApproved),[proposal,catalogReview,servApproved]);

  function update<K extends keyof Proposal>(key:K,value:Proposal[K]) {
    setProposal(v=>({...v,[key]:value}));
    setCatalogReview(v=>({...v,userConfirmed:false}));
    setReport(null);setVerification('idle');setError('');setNotifications('');
  }
  function selectCase(id:CaseId) {
    setCaseId(id);setProposal({...cases[id].proposal});
    setCatalogReview({serviceId:'',endpoint:'',priceUsd:0,userConfirmed:false});
    setReport(null);setError('');setNotifications('');
    setArea('workspace');
  }
  function localCheck() {
    const checked=evaluate(proposal);
    setReport({createdAt:new Date().toISOString(),mode:'local-policy',proposal:{...proposal},policy:checked,serv:null,paymentExecuted:false});
    setError('');
  }
  async function liveAnalysis() {
    if(!access.trim()){setError('Enter the project access code to enable a real SERV request.');return;}
    setBusy(true);setError('');setReport(null);
    try{
      const response=await fetch('/api/analyze',{
        method:'POST',headers:{'Content-Type':'application/json','x-spendproof-access':access},body:JSON.stringify(proposal)
      });
      const data=await response.json();
      if(!response.ok) throw Error(typeof data.error==='string'?data.error:'SERV is unavailable.');
      if(!data.policy || !['BLOCK','REVIEW'].includes(data.policy.verdict)) throw Error('Unexpected response format.');
      setReport({createdAt:new Date().toISOString(),mode:data.mode,proposal:{...proposal},policy:data.policy,serv:data.serv||null,paymentExecuted:false,model:data.model,attestation:data.attestation||null});
      setVerification('idle');
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to contact SERV.');
    }finally{setBusy(false);}
  }
  async function verifyAttestation() {
    if(!report?.attestation)return;
    setVerification('checking');
    try {
      const response=await fetch('/api/verify',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({attestation:report.attestation}),
      });
      const data=await response.json();
      setVerification(response.ok && data.authentic===true?'verified':'invalid');
    }catch{
      setVerification('invalid');
    }
  }

  async function copy(value:string,id:string) {
    try{await navigator.clipboard.writeText(value);setCopied(id);}
    catch{setNotifications('Clipboard was blocked. Select the command and copy it manually.');}
  }
  async function exportAudit() {
    if(!report)return;
    const body={schema:'spendproof.audit.v1',...report,explanation:'Local SHA-256 cannot prove origin. Server HMAC attestation authenticates only a SpendProof decision, never provider legitimacy or payment execution.'};
    const canonical=JSON.stringify(body);
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
    const checksum=Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
    const blob=new Blob([JSON.stringify({...body,checksumSha256:checksum},null,2)],{type:'application/json'});
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='spendproof-audit-'+Date.now()+'.json';
    link.click();URL.revokeObjectURL(link.href);
  }

  return <div className="application">
    <aside className="sidebar">
      <div className="brand"><BrandMark/><span>Spend<span className="brand-accent">Proof</span></span></div>
      <div className="side-caption">AI PAYMENT INTELLIGENCE</div>
      <div className="sidebar-nav">
        <div className="nav-group-label">PLATFORM</div>
        <button className={'nav-item '+(area==='workspace'?'selected':'')} onClick={()=>setArea('workspace')}><LayoutDashboard size={18}/> Decision workspace <ChevronRight className="nav-chevron" size={16}/></button>
        <button className={'nav-item '+(area==='audit'?'selected':'')} onClick={()=>setArea('audit')}><FileCheck2 size={18}/> Audit trail <ChevronRight className="nav-chevron" size={16}/></button>
        <button className={'nav-item '+(area==='passport'?'selected':'')} onClick={()=>setArea('passport')}><Wallet size={18}/> Kite handoff <ChevronRight className="nav-chevron" size={16}/></button>
        <div className="nav-group-label second">RESOURCES</div>
        <a className="nav-item nav-link" target="_blank" rel="noreferrer" href="https://docs.gokite.ai/passport/payments"><BookOpen size={18}/> Kite documentation <ArrowUpRight className="nav-chevron" size={15}/></a>
        <a className="nav-item nav-link" target="_blank" rel="noreferrer" href="https://www.openserv.ai/hackathon-2"><Globe2 size={18}/> Hackathon 02 <ArrowUpRight className="nav-chevron" size={15}/></a>
      </div>
      <div className="sidebar-bottom">
        <div className="system-box"><div className="system-head"><span className="pulse-dot"/> System integrity</div><strong>Policy engine ready</strong><span>AI & payments require setup</span></div>
        <div className="side-profile"><BrandMark small/><div><strong>Builder workspace</strong><span>Hackathon prototype · v0.1</span></div><span className="side-more">•••</span></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="crumb"><span>Products</span><ChevronRight size={14}/><span>SpendProof</span><ChevronRight size={14}/><strong>{area==='workspace'?'Workspace':area==='audit'?'Audit trail':'Kite handoff'}</strong></div>
        <div className="top-actions"><span className="top-tag"><span className="mini-pulse"/> Policy-first build</span><a href="https://github.com/bearbaba/SpendProof" target="_blank" rel="noreferrer" className="github-link">GitHub <ArrowUpRight size={15}/></a></div>
      </header>

      <div className="content">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line"/> AGENT SPENDING, UNDER CONTROL</div>
            <h1>Every payment deserves<br/><em>a reason.</em></h1>
            <p>Review what your agent wants to buy, enforce strict spending limits, and create a clear audit trail <strong>before money moves.</strong></p>
            <button className="hero-cta" onClick={()=>setArea('workspace')}>Review a payment <ArrowRight size={18}/></button>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="trace-top"><div className="trace-icon"><ShieldCheck size={22}/></div><div><span>SPENDING DECISION</span><strong>Review required</strong></div><span className="trace-circle">•••</span></div>
            <div className="trace-flow"><div><span className="trace-number">01</span><span>Check spending policy</span><Check size={17}/></div><div><span className="trace-number">02</span><span>Analyze provider claims</span><Sparkles size={17}/></div><div className="trace-muted"><span className="trace-number">03</span><span>Approve in Kite Passport</span><LockKeyhole size={17}/></div></div>
            <div className="trace-footer"><span><span className="mini-pulse"/> No automatic transfers</span><span className="trace-footer-brand">SP / 02</span></div>
          </div>
        </section>

        <div className="stat-grid">
          <div className="stat-card"><div className="stat-icon violet"><Shield size={19}/></div><div><span>Deterministic guardrails</span><strong>08 <small>checks</small></strong></div><span className="stat-foot">Always applied</span></div>
          <div className="stat-card"><div className="stat-icon blue"><Fingerprint size={19}/></div><div><span>Human authorization</span><strong>Required</strong></div><span className="stat-foot">Kite Passport</span></div>
          <div className="stat-card"><div className="stat-icon green"><ReceiptText size={19}/></div><div><span>Funds controlled by app</span><strong>$0.00</strong></div><span className="stat-foot">No custody</span></div>
        </div>

        {area==='workspace' && <>
          <div className="section-head"><div><div className="section-kicker">DECISION LAB</div><h2>Review an agent purchase</h2><p>Run reproducible checks against an explicit payment proposal.</p></div><span className="section-step">01 / 03 · Validate</span></div>
          <div className="workspace-grid">
            <section className="panel input-panel">
              <div className="panel-header"><div className="panel-title"><span className="panel-icon"><ClipboardCheck size={19}/></span><div><h3>Payment request</h3><p>Define the task, supplier and spending limits.</p></div></div><span className="panel-label">INPUT</span></div>
              <div className="preset-heading">TEST SCENARIOS <span>Illustrative fixtures, not live suppliers</span></div>
              <div className="preset-grid">
                {(Object.entries(cases) as [CaseId,typeof cases[CaseId]][]).map(([id,entry])=><button key={id} className={'preset '+(caseId===id?'active':'')} onClick={()=>selectCase(id)}><span className="preset-top">{id==='within'?<CheckCircle2 size={16}/>:id==='over'?<ShieldAlert size={16}/>:<Info size={16}/>} {entry.label}</span><span>{entry.sub}</span></button>)}
              </div>
              <div className="form-divider"/>
              <label className="field"><span>Task objective <b>*</b></span><textarea rows={3} value={proposal.task} maxLength={700} onChange={e=>update('task',e.target.value)} placeholder="What is the agent trying to accomplish?"/></label>
              <div className="field-row"><label className="field"><span>Provider name</span><input value={proposal.provider} maxLength={120} onChange={e=>update('provider',e.target.value)} placeholder="Provider"/></label><label className="field"><span>Request method</span><select value={proposal.method} onChange={e=>update('method',e.target.value as Proposal['method'])}><option>GET</option></select></label></div>
              <label className="field"><span>Paid API endpoint</span><input type="url" value={proposal.endpoint} maxLength={1000} onChange={e=>update('endpoint',e.target.value)} placeholder="https://..."/></label>
              <label className="field"><span>Supporting evidence URL</span><input type="url" value={proposal.evidenceUrl} maxLength={1000} onChange={e=>update('evidenceUrl',e.target.value)} placeholder="Link to pricing or merchant documentation"/></label>
              <div className="amount-fields">
                {([['amountUsd','Proposed cost'],['budgetUsd','Task budget'],['perTxUsd','Per-tx limit'],['remainingUsd','Remaining budget']] as const).map(([id,name])=><label className="field" key={id}><span>{name}</span><div className="amount-input"><span>$</span><input type="number" min="0" max="100000" step="0.01" value={proposal[id]} onChange={e=>update(id,Number(e.target.value))}/><small>USD</small></div></label>)}
              </div>
              <label className="check-field"><input type="checkbox" checked={proposal.supportsX402} onChange={e=>update('supportsX402',e.target.checked)}/><span><strong>Provider claims x402 compatibility</strong><small>Check this only if you have a provider claim; it is not independent verification.</small></span></label>
              <div className="form-actions">
                <button className="btn-outline" onClick={localCheck}><Play size={16}/> Check locally</button>
                <button className="btn-dark" onClick={liveAnalysis} disabled={busy}>{busy?<LoaderCircle size={16} className="spinning"/>:<Sparkles size={16}/>} {busy?'Analyzing…':'Analyze with SERV'} <ArrowRight size={16}/></button>
              </div>
              <div className="access-field"><LockKeyhole size={15}/><input type="password" value={access} onChange={e=>setAccess(e.target.value)} autoComplete="off" placeholder="Project access code for live SERV" aria-label="SERV access code"/><span>SERVER AUTH</span></div>
              {error && <div className="alert-error" role="alert"><XCircle size={17}/>{error}</div>}
            </section>

            <section className="panel decision-panel">
              <div className="panel-header"><div className="panel-title"><span className="panel-icon"><ShieldCheck size={19}/></span><div><h3>Decision intelligence</h3><p>Deterministic controls, independent of AI.</p></div></div><span className="panel-label">LIVE PREVIEW</span></div>
              <div className={'verdict '+(policy.verdict==='BLOCK'?'blocked':'review')}>
                <div><div className="verdict-label"><span className={'verdict-dot '+(policy.verdict==='BLOCK'?'red':'amber')}/>{policy.verdict==='BLOCK'?'POLICY BLOCKED':'REVIEW REQUIRED'}</div><strong>{policy.verdict==='BLOCK'?'This request must not proceed.':'Eligible for further review.'}</strong><p>{policy.verdict==='BLOCK'?'One or more spending controls failed. Fix the proposal before analysis.':'All local limits passed, but real provider checks and passkey approval are still outstanding.'}</p></div>
                {policy.verdict==='BLOCK'?<ShieldAlert size={36}/>:<ShieldCheck size={36}/>}
              </div>
              <div className="checks-heading"><strong>Safety controls</strong><span>{passed} of {policy.checks.length} passed</span></div>
              <div className="checks-progress"><span style={{width:(passed/policy.checks.length*100)+'%'}}/></div>
              <div className="checks-list">{policy.checks.map(c=><div className="check-row" key={c.id}><span className={'check-status '+(c.passed?'ok':'fail')}>{c.passed?<Check size={15}/>:<XCircle size={15}/>}</span><div><strong>{c.title}</strong><p>{c.detail}</p></div></div>)}</div>
              <div className="decision-bottom"><div className="decision-cost"><span>Proposed charge</span><strong>{usd(proposal.amountUsd)}</strong></div><div className="decision-cost"><span>Task ceiling</span><strong>{usd(proposal.budgetUsd)}</strong></div><div className="decision-cost"><span>Funds transferred</span><strong>$0.00</strong></div></div>
              {report && <div className="analysis-result">
                <div className="analysis-result-head"><strong><Activity size={17}/> {report.mode==='serv-live'?'Live SERV analysis':'Local policy result'}</strong><button onClick={()=>setArea('audit')}>Audit details <ArrowRight size={15}/></button></div>
                {report.serv?<><p>{report.serv.summary}</p><span className={'risk-pill risk-'+report.serv.risk}>{report.serv.risk.toUpperCase()} RISK</span>{report.serv.concerns.length>0&&<ul>{report.serv.concerns.map((x,i)=><li key={i}>{x}</li>)}</ul>}</>:<p>{report.policy.verdict==='BLOCK'?'Request blocked by deterministic guardrails. No SERV call or payment was performed.':'Policy check completed locally. No provider verification, SERV call or payment was performed.'}</p>}
              </div>}
            </section>
          </div>
          <div className="next-step">
            <div className="next-icon"><Wallet size={21}/></div><div><strong>Ready for the next step?</strong><p>Passing policy checks does not authorize spending. Review the Kite Passport session handoff.</p></div><button onClick={()=>setArea('passport')}>Open Kite handoff <ArrowRight size={17}/></button>
          </div>
        </>}

        {area==='audit' && <>
          <div className="section-head"><div><div className="section-kicker">REPRODUCIBLE EVIDENCE</div><h2>Decision audit trail</h2><p>Every outcome is explicit. A local checksum is not a transaction receipt.</p></div><span className="section-step">02 / 03 · Trace</span></div>
          <section className="panel audit-panel">
            <div className="panel-header"><div className="panel-title"><span className="panel-icon"><FileCheck2 size={19}/></span><div><h3>Latest evaluation</h3><p>Saved only in this browser tab until export.</p></div></div><span className="panel-label">LOCAL SESSION</span></div>
            {!report?<div className="empty-state"><div className="empty-icon"><Activity size={25}/></div><h3>No audit recorded yet</h3><p>Run a local policy check or a live SERV analysis in the workspace to create an audit.</p><button className="btn-dark" onClick={()=>setArea('workspace')}>Go to workspace <ArrowRight size={16}/></button></div>:
            <><div className="audit-summary"><div><span>FINAL POLICY STATUS</span><strong className={report.policy.verdict==='BLOCK'?'text-red':'text-amber'}>{report.policy.verdict}</strong></div><div><span>EXECUTION</span><strong>NOT EXECUTED</strong></div><div><span>ANALYSIS TYPE</span><strong>{report.mode==='serv-live'?'LIVE SERV':'LOCAL POLICY'}</strong></div><div><span>EVALUATED</span><strong>{new Date(report.createdAt).toLocaleString()}</strong></div></div>
            <div className="audit-section-title">Control-by-control evidence</div>
            <div className="audit-records">{report.policy.checks.map((c,i)=><div key={c.id}><span className="record-number">{String(i+1).padStart(2,'0')}</span><Dot ok={c.passed}/><div><strong>{c.title}</strong><p>{c.detail}</p></div><span className={c.passed?'record-passed':'record-blocked'}>{c.passed?'PASS':'FAIL'}</span></div>)}</div>
            {report.serv && <div className="serv-audit"><div className="audit-section-title">SERV Reasoning assessment · {report.model||'configured model'}</div><p>{report.serv.summary}</p><strong>Evidence gaps</strong><ul>{report.serv.evidenceGaps.length?report.serv.evidenceGaps.map((x,i)=><li key={i}>{x}</li>):<li>Provider verification still requires an external source.</li>}</ul></div>}
            {report.attestation && <div className="signed-proof"><div><strong><ShieldCheck size={16}/> Server-signed decision</strong><p>{verification==='verified'?'Authentic SpendProof decision · no payment verified':verification==='invalid'?'Verification failed · this decision is not authenticated':'HMAC-SHA256 authentication of the SERV decision, not a merchant or transaction receipt.'}</p></div><button className="btn-outline" disabled={verification==='checking'} onClick={verifyAttestation}>{verification==='checking'?'Checking…':'Verify signature'}</button></div>}
            <div className="audit-export"><span><Info size={17}/> Reports are not signed on-chain or merchant-verified.</span><button className="btn-dark" onClick={exportAudit}><Download size={16}/> Export JSON audit</button></div></>}
          </section>
        </>}

        {area==='passport' && <>
          <div className="section-head"><div><div className="section-kicker">HUMAN-IN-THE-LOOP</div><h2>Kite Passport handoff</h2><p>Inspect the real provider, obtain SERV assessment and explicitly approve a bounded Kite spending session.</p></div><span className="section-step">03 / 03 · Authorize</span></div>
          <div className="handoff-banner"><div className="handoff-badge"><Fingerprint size={24}/></div><div><h3>No payment is initiated by this browser.</h3><p>Kite currently exposes the approved flow through its CLI and agent skills. No public HTTP API is documented, so SpendProof generates commands instead of pretending to complete an x402 purchase. <a href="https://docs.gokite.ai/api-reference" target="_blank" rel="noreferrer">View the official API status <ExternalLink size={13}/></a></p></div></div>
          <section className="panel handoff-panel">
            <div className="panel-header"><div className="panel-title"><span className="panel-icon"><Code2 size={19}/></span><div><h3>Verified workflow, not automatic payment</h3><p>Copy the commands into your authenticated Kite-enabled terminal.</p></div></div><span className="panel-label">EXTERNAL CLI</span></div>
            <div className="catalog-review">
              <div className="catalog-review-title"><div><h3>Catalog cross-check</h3><p>Run discovery and inspection in your Kite terminal, then enter the exact information you observed. This form does not fetch or authenticate catalog records.</p></div><span>{catalogChecks.filter(c=>c.passed).length}/{catalogChecks.length} checks</span></div>
              <div className="field-row">
                <label className="field"><span>Kite catalog service ID</span><input value={catalogReview.serviceId} maxLength={120} onChange={e=>setCatalogReview(v=>({...v,serviceId:e.target.value,userConfirmed:false}))} placeholder="Copy from ksearch output" autoComplete="off"/></label>
                <label className="field"><span>Listed price (USDC)</span><input type="number" min="0" step="0.01" value={catalogReview.priceUsd} onChange={e=>setCatalogReview(v=>({...v,priceUsd:Number(e.target.value),userConfirmed:false}))}/></label>
              </div>
              <label className="field"><span>Catalog endpoint (must match exactly)</span><input type="url" value={catalogReview.endpoint} maxLength={1000} onChange={e=>setCatalogReview(v=>({...v,endpoint:e.target.value,userConfirmed:false}))} placeholder="Paste endpoint from the inspected service"/></label>
              <label className="check-field"><input type="checkbox" checked={catalogReview.userConfirmed} onChange={e=>setCatalogReview(v=>({...v,userConfirmed:e.target.checked}))}/><span><strong>I independently compared the price and URL with the live Kite catalog.</strong><small>This is a manual acknowledgement, not a verified API response. Never paste private keys or Passport sessions.</small></span></label>
              <div className="catalog-checks">{catalogChecks.map(c=><div key={c.id} className={c.passed?'review-pass':'review-fail'}>{c.passed?<Check size={14}/>:<XCircle size={14}/>} {c.label}</div>)}</div>
            </div>
            {!canHandoff && <div className="blocked-alert"><ShieldAlert size={17}/> Discovery remains available. Payment commands require a signed live SERV review and a complete manual Kite catalog cross-check. The actual session must still be approved with your passkey.</div>}
            <div className="command-list">{commands.map((c,i)=><div className="command-block" key={c.id}><div className="command-title"><span className="command-index">{i+1}</span><div><strong>{c.title}</strong><p>{c.description}</p></div><span className="command-state">{c.stage}</span></div><div className={'terminal '+(c.command===null?'disabled':'')}><code>{c.command??'Locked until the relevant review and authorization requirements are satisfied.'}</code><button disabled={c.command===null} title={'Copy '+c.title} onClick={()=>copy(c.command??'',c.id)}>{copied===c.id?<Check size={17}/>:<Copy size={17}/>}</button></div></div>)}</div>
            {notifications && <div className="alert-error" role="alert">{notifications}</div>}
            <div className="handoff-footer"><span><ShieldCheck size={18}/> The user approves any real spending in Kite Passport with a passkey.</span><a href="https://agentpassport.ai/dashboard" target="_blank" rel="noreferrer">Open Passport dashboard <ArrowUpRight size={16}/></a></div>
          </section>
        </>}

        <footer className="footer"><span><BrandMark small/> SpendProof <i>·</i> Built for OpenServ Hackathon 02</span><span>No automatic transfers <span className="footer-dot"/> Evidence before execution</span></footer>
      </div>
    </main>
  </div>;
}
