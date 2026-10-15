import {claimNode24Request} from '/tmp/averian-node24-eval-budget-20261015.mjs'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {resolve, dirname} from 'node:path'
const root=process.cwd()
const require=createRequire(resolve(root,'package.json'))
const {chromium,expect}=require('@playwright/test')
const AxeBuilder=require('@axe-core/playwright').default
const {RESEARCH_EVAL_CASES}=await import(resolve(root,'lib/ai/eval/research-cases.ts'))
const {assessResearchResponse,validateEvaluationTarget}=await import(resolve(root,'lib/ai/eval/runner.ts'))
const target=validateEvaluationTarget(process.env)
if(target.kind!=='hosted_review')throw new Error('Expected the authorized anonymous review target')
if(!process.env.EVALUATED_SOURCE)throw new Error('Exact source commit required')
const source=process.env.EVALUATED_SOURCE
const output=resolve(root,process.env.AI_EVAL_OUTPUT!)
const evidencePath=resolve(dirname(output),'final-live-ui.json')
const folder=dirname(output)
const fullSuite=JSON.parse(await readFile(resolve(root,process.env.AI_FINAL_SUITE_PATH!),'utf8'))
const criticalCases=RESEARCH_EVAL_CASES.filter(entry=>entry.calculation||entry.id==='missing-molar-mass');const criticalHash=createHash('sha256').update(JSON.stringify(criticalCases)).digest('hex');if(criticalCases.length!==18||fullSuite.origin!==target.origin||fullSuite.suiteHash!==criticalHash||fullSuite.state!=='executed'||fullSuite.executedCases!==18||fullSuite.rows.some(r=>!r.completed||!r.numericalCorrectness||!r.guidanceCorrectness||r.invalidSuccess))throw new Error('Exactly18 passing official critical API cases on this target must precede the additional live UI pair')
try{await readFile(output);throw new Error('Output already exists; do not overwrite live evidence')}catch(e){if(e.code!=='ENOENT')throw e}
await mkdir(folder,{recursive:true})
const check=await fetch(target.origin+'/en',{redirect:'error',signal:AbortSignal.timeout(60000)})
const robots=check.headers.get('x-robots-tag')??''
await check.body?.cancel()
if(!check.ok||!/noindex/i.test(robots)||!/nofollow/i.test(robots))throw new Error('Candidate is not a noindex/nofollow review site')
const seededRows=[]
const ui=[]
const suiteHash=createHash('sha256').update(JSON.stringify(RESEARCH_EVAL_CASES.slice(0,2))).digest('hex')
async function checkpoint(state='running',reason){await writeFile(output,JSON.stringify({checkedAt:new Date().toISOString(),origin:target.origin,sourceCommit:source,target:target.kind,suiteHash,state,reason,selection:'paired_subset',expectedCases:2,executedCases:seededRows.length,scope:'Live API, no persistence, no retrieval, read-only tools. Hosted review runs are anonymous with no cookies. Source, language and scientific assessment are separate from runtime/numerical checks.',rows:seededRows},null,2)+'\n')}
async function saveEvidence(){await writeFile(evidencePath,JSON.stringify({checkedAt:new Date().toISOString(),origin:target.origin,sourceCommit:source,suiteHash,note:'After the separate18-case Node24 critical API subset completed, the EN/FI concentration pair was repeated through the actual final-artifact browser composer. Each was forwarded once to the real same-origin API by anonymous Node fetch, without cookies, using the official readOnly/noPersist/noRetrieve body. The actual complete SSE response was buffered and delivered unchanged to the browser parser via route.fulfill. This verifies actual API results and UI rendering, not incremental network delivery. No synthetic answer was used. Original-report source cards are not expected for this pure calculation: the real structured calculation card contains the actual inputs/formula and deterministic recomputed result.',checks:ui},null,2)+'\n')}
async function beginRequest(body){return claimNode24Request('ui',target.origin,source,body)}
await checkpoint()
const browser=await chromium.launch()
try{
 for(const entry of RESEARCH_EVAL_CASES.slice(0,2)){
  if(entry.id!=='concentration')throw new Error('Expected the official first EN/FI concentration pair')
  const locale=entry.locale
  const m=JSON.parse(await readFile(resolve(root,`messages/${locale}.json`),'utf8'))
  const context=await browser.newContext({viewport:locale==='fi'?{width:390,height:844}:{width:1440,height:1000},colorScheme:'light',locale:locale==='fi'?'fi-FI':'en-GB'})
  await context.addCookies([{name:'averianlabs-age-confirmed',value:'1',url:target.origin},{name:'averia_consent',value:'declined',url:target.origin}])
  await context.addInitScript(()=>{localStorage.setItem('averianlabs-cookie-consent','essential');localStorage.setItem('theme','light')})
  const page=await context.newPage();page.setDefaultTimeout(30000)
  const item={locale,prompt:entry.prompt,viewport:page.viewportSize(),pageErrors:[],consoleErrors:[],requestCount:0,requestFlags:null,cookieHeaderSent:false,anonymousNoAccount:true,rendering:null,overflow:null,axeViolations:[],screenshots:[]}
  ui.push(item)
  page.on('pageerror',e=>item.pageErrors.push({at:new Date().toISOString(),message:e.message}))
  page.on('console',m=>{if(m.type()==='error')item.consoleErrors.push({at:new Date().toISOString(),text:m.text()})})
  let resolveAPI,rejectAPI
  const apiReady=new Promise((resolve,reject)=>{resolveAPI=resolve;rejectAPI=reject})
  await page.route('**/api/ai/chat',async route=>{
   try{
    item.requestCount++
    if(item.requestCount!==1)throw new Error('Unexpected duplicate model request; do not resend')
    const outgoing=route.request().postDataJSON()
    if(outgoing.locale!==locale||outgoing.messages.length!==1||outgoing.messages[0].role!=='user'||outgoing.messages[0].content!==entry.prompt)throw new Error('Actual typed composer request must match exact first official case')
    const body={locale,noPersist:true,readOnly:true,noRetrieve:true,messages:outgoing.messages}
    item.requestFlags={readOnly:body.readOnly,noPersist:body.noPersist,noRetrieve:body.noRetrieve}
    const started=await beginRequest(body);item.requestStartedAt=new Date(started).toISOString()
    const response=await fetch(target.origin+'/api/ai/chat',{method:'POST',redirect:'error',signal:AbortSignal.timeout(180000),headers:{'content-type':'application/json'},body:JSON.stringify(body)})
    const raw=await response.text()
    item.rawSseSha256=createHash('sha256').update(raw).digest('hex');item.responseStatus=response.status;item.responseCompletedAt=new Date().toISOString()
    await writeFile(resolve(folder,`final-live-ui-${locale}.sse.txt`),raw)
    const row={...assessResearchResponse(entry,response.status,raw),latencyMs:Date.now()-started,checkedAt:new Date().toISOString()}
    seededRows.push(row);await checkpoint(response.status===429||response.status===503?'incomplete':'running',response.status===429?'rate_limited':response.status===503?'provider_unavailable':undefined)
    item.runtime={completed:row.completed,numericalCorrectness:row.numericalCorrectness,guidanceCorrectness:row.guidanceCorrectness,invalidSuccess:row.invalidSuccess,errors:row.errors,toolNames:row.toolNames}
    await route.fulfill({status:response.status,headers:{'content-type':response.headers.get('content-type')??'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform'},body:raw})
    resolveAPI(row)
   }catch(e){await route.abort().catch(()=>{});rejectAPI(e)}
  })
  const pageResponse=await page.goto(target.origin+`/${locale}/assistant`,{waitUntil:'networkidle',timeout:60000});item.pageStatus=pageResponse.status()
  const main=page.locator('main')
  await main.getByRole('textbox',{name:m.averia.inputLabel,exact:true}).fill(entry.prompt)
  await main.getByRole('button',{name:m.averia.send,exact:true}).click()
  const row=await apiReady
  if(!row.completed||!row.numericalCorrectness||row.invalidSuccess||!row.guidanceCorrectness)throw new Error('Real seed response failed official assessment')
  const calc=row.toolResults.find(t=>t.name==='calculateLaboratory')?.content?.calculation
  if(calc?.inputs?.massMg!==10||calc?.inputs?.finalVolumeMl!==2||calc?.values?.concentrationMgPerMl!==5)throw new Error('Real tool inputs/results differ from expected10mg/2mL=5mg/mL')
  await expect(main.getByRole('button',{name:m.averia.send,exact:true})).toBeVisible({timeout:30000})
  const card=main.locator('section').filter({has:page.getByRole('heading',{name:m.calculator.exportTitle,exact:true})})
  await expect(card).toBeVisible({timeout:30000})
  await expect(card).toContainText('5 mg/mL')
  await expect(card).toContainText('c = m / V')
  await expect(card).toContainText(m.averia.assistant.inputs.massMg)
  await expect(card).toContainText(m.averia.assistant.inputs.finalVolumeMl)
  await expect(main.getByRole('log')).toContainText('5 mg/mL')
  const actualCardText=await card.innerText();const actualLogText=await main.getByRole('log').innerText()
  item.rendering={actualToolInputs:calc.inputs,actualToolValues:calc.values,structuredCalculationCard:actualCardText,answerAndLog:actualLogText,sourceScope:'Actual user-input/formula calculation record; no original product or batch-report citation was requested or invented.'}
  await page.waitForTimeout(750)
  item.overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,hasHorizontalOverflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth+1}))
  const axe=await new AxeBuilder({page}).analyze();item.axeViolations=axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}))
  for(const position of ['answer-start','calculation-card']){if(position==='answer-start')await main.getByRole('log').evaluate(el=>el.scrollTop=0);else await card.scrollIntoViewIfNeeded();const name=`final-live-ui-${locale}-${position}.png`;await page.screenshot({path:resolve(folder,name),fullPage:true});item.screenshots.push(name)}
  await saveEvidence()
  if(item.pageErrors.length||item.overflow.hasHorizontalOverflow||item.axeViolations.length>0)throw new Error('Real UI has a page error, horizontal overflow or accessibility failure')
  console.log(`${locale}/concentration actual API + composer/card verified`)
  await context.close()
 }
 await checkpoint('executed');await saveEvidence();console.log('Two additional actual API + final browser UI calculations verified; separate from the18-case critical subset and all older full60 evidence.')
}catch(e){await checkpoint('incomplete',e.name);ui.push({failure:{name:e.name,message:e.message,at:new Date().toISOString()}});for(const item of ui){if(item.locale&&!item.screenshots?.length){const page=browser.contexts().find(c=>c.pages().length)?.pages()[0];if(page)await page.screenshot({path:resolve(folder,`final-live-ui-${item.locale}-failure.png`),fullPage:true,timeout:5000}).catch(()=>{})}}await saveEvidence();throw e}finally{await browser.close();const budgetPath=process.env.AI_EVAL_PACING_STATE;if(budgetPath){const budget=JSON.parse(await readFile(budgetPath,'utf8'));if(budget.requests.length===20){budget.finishedAt=new Date().toISOString();budget.cooldownUntil=new Date(Date.now()+602000).toISOString();await writeFile(budgetPath,JSON.stringify(budget,null,2)+'\n')}}}
