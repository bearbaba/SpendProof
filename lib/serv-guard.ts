export type ServGateResult =
  | { allowed:true; release:()=>void }
  | { allowed:false; reason:'BUSY'|'COOLDOWN'|'DAILY_LIMIT'; retryAfterSeconds:number };

export function createServGate(options = { cooldownMs:15_000, dailyLimit:20 }) {
  let windowStartMs = -1;
  let callsInWindow = 0;
  let lastAttemptMs = -Infinity;
  let inFlight = false;

  function reserve(now = Date.now()): ServGateResult {
    if (windowStartMs === -1 || now - windowStartMs >= 86_400_000 || now < windowStartMs) {
      windowStartMs = now;
      callsInWindow = 0;
    }
    if (inFlight) return { allowed:false, reason:'BUSY', retryAfterSeconds:5 };
    if (callsInWindow >= options.dailyLimit) {
      return { allowed:false, reason:'DAILY_LIMIT',
        retryAfterSeconds:Math.max(1,Math.ceil((windowStartMs + 86_400_000 - now)/1000)) };
    }
    const since = now - lastAttemptMs;
    if (since < options.cooldownMs) {
      return { allowed:false, reason:'COOLDOWN',
        retryAfterSeconds:Math.max(1,Math.ceil((options.cooldownMs-since)/1000)) };
    }
    inFlight = true;
    callsInWindow += 1;
    lastAttemptMs = now;
    let released = false;
    return {
      allowed:true,
      release:()=>{
        if (released) return;
        released = true;
        inFlight = false;
      },
    };
  }
  return { reserve };
}

// This is a process-local safety mechanism, not a durable cross-instance billing limit.
// Real production deployments MUST also configure a provider-side SERV credit cap.
export const localServGate = createServGate();
