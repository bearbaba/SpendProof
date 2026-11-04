/** Resolve only the official native executable; never invoke a command shell. */
export function kiteExecutableForPlatform(
  command:'kpass'|'ksearch', platform:string,
):string {
  return platform==='win32'?command+'.exe':command;
}

export type CliProbeKey =
  'kpassVersion'|'ksearchVersion'|
  'kpassReference'|'kpassWalkthrough'|
  'ksearchReference'|'ksearchWalkthrough';

export type ProbeEvidence={ok:boolean; output:string};
export type Dialect='cli-reference'|'payments-walkthrough'|'both-candidates'|'undetermined';

export type PreflightSummary={
  kpassInstalled:boolean;
  ksearchInstalled:boolean;
  sessionDialect:Dialect;
  discoveryDialect:Dialect;
  readyForManualInspection:boolean;
  livePaymentVerified:false;
};

export const READ_ONLY_PROBES:{
  key:CliProbeKey;
  executable:'kpass'|'ksearch';
  args:readonly string[];
}[]=[
  {key:'kpassVersion',executable:'kpass',args:['--version']},
  {key:'ksearchVersion',executable:'ksearch',args:['--version']},
  {key:'kpassReference',executable:'kpass',args:['agent:session','--help']},
  {key:'kpassWalkthrough',executable:'kpass',args:['session','--help']},
  {key:'ksearchReference',executable:'ksearch',args:['services','--help']},
  {key:'ksearchWalkthrough',executable:'ksearch',args:['service','--help']},
];

function supported(probe:ProbeEvidence|undefined,verbs:string[]):boolean{
  if(!probe?.ok) return false;
  const output=probe.output.toLowerCase();
  return verbs.every(verb=>new RegExp('\\b'+verb+'\\b').test(output));
}

function dialect(ref:boolean,walk:boolean):Dialect{
  if(ref && walk) return 'both-candidates';
  if(ref) return 'cli-reference';
  if(walk) return 'payments-walkthrough';
  return 'undetermined';
}

export function summarizeKitePreflight(
  probes:Partial<Record<CliProbeKey,ProbeEvidence>>,
):PreflightSummary{
  const kpassInstalled=probes.kpassVersion?.ok===true;
  const ksearchInstalled=probes.ksearchVersion?.ok===true;
  const sessionDialect=dialect(
    supported(probes.kpassReference,['create','execute']),
    supported(probes.kpassWalkthrough,['create','execute']),
  );
  const discoveryDialect=dialect(
    supported(probes.ksearchReference,['list','get']),
    supported(probes.ksearchWalkthrough,['list','get']),
  );
  return {
    kpassInstalled,ksearchInstalled,sessionDialect,discoveryDialect,
    readyForManualInspection:kpassInstalled&&ksearchInstalled &&
      sessionDialect!=='undetermined'&&discoveryDialect!=='undetermined',
    livePaymentVerified:false,
  };
}
