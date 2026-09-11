import { config } from "./config";

export type OpenReplayUser = { email?: string; name?: string } | null | undefined;

/** True when OPENREPLAY_PROJECT_KEY is set. */
export function isOpenReplayEnabled(): boolean {
  return Boolean(config.openreplay.projectKey.trim());
}

/**
 * Inject into &lt;head&gt; on MF pages. No-op when project key is empty.
 * Loads openreplay-assist.js for live Cobrowse / Assist.
 * @see https://docs.openreplay.com/en/plugins/assist/
 */
export function openReplayHeadScript(user?: OpenReplayUser): string {
  const projectKey = config.openreplay.projectKey.trim();
  if (!projectKey) return "";

  const ingest = config.openreplay.ingestPoint.trim().replace(/\/$/, "");
  const scriptSrc = config.openreplay.assist
    ? config.openreplay.scriptAssist
    : config.openreplay.scriptTracker;

  const initOpts: Record<string, unknown> = {
    projectKey,
    defaultInputMode: 0,
    obscureTextEmails: false,
    obscureTextNumbers: false,
  };
  if (ingest) initOpts.ingestPoint = ingest;
  if (config.openreplay.disableSecureMode) initOpts.__DISABLE_SECURE_MODE = true;

  const userID = (user?.email || "").trim();
  const startOpts: Record<string, unknown> = { userID };

  // Official snippet shape from OpenReplay Assist docs (CDN loader).
  return `<!-- OpenReplay Tracking Code -->
<script>
var initOpts = ${JSON.stringify(initOpts)};
var startOpts = ${JSON.stringify(startOpts)};
(function(A,s,a,y,e,r){
  r=window.OpenReplay=[e,r,y,[s-1, e]];
  s=document.createElement('script');s.src=A;s.async=!a;
  document.getElementsByTagName('head')[0].appendChild(s);
  r.start=function(v){r.push([0])};
  r.stop=function(v){r.push([1])};
  r.setUserID=function(id){r.push([2,id])};
  r.setUserAnonymousID=function(id){r.push([3,id])};
  r.setMetadata=function(k,v){r.push([4,k,v])};
  r.event=function(k,p,i){r.push([5,k,p,i])};
  r.issue=function(k,p){r.push([6,k,p])};
  r.isActive=function(){return false};
  r.getSessionToken=function(){};
})(${JSON.stringify(scriptSrc)},1,0,initOpts,startOpts);
${user?.name?.trim() ? `window.OpenReplay.setMetadata("name", ${JSON.stringify(user.name.trim())});` : ""}
</script>`;
}
