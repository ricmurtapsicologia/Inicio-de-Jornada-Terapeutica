import { chromium } from 'playwright';

const prefix='TESTE E2E NAO E PACIENTE';
const marker=prefix+' '+String(process.env.GITHUB_RUN_ID||'LOCAL');
const base='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/';
const output=[];
function log(stage, ok, detail='') {const row={stage,ok,detail}; output.push(row); console.log('CHECK '+JSON.stringify(row));}
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',ignoreHTTPSErrors:false});
try {
  const controle=await context.newPage();
  const cRes=await controle.goto(base+'monitoramento.html?instrument=controle&test=1',{waitUntil:'domcontentloaded',timeout:45000});
  await controle.waitForSelector('#clinical-form',{timeout:20000});
  const falseError=await controle.locator('.rm-unavailable').count();
  const formTarget=await controle.locator('#clinical-form').getAttribute('target');
  const required=await controle.locator('#clinical-form [required]').count();
  log('controle-render',cRes?.status()===200 && falseError===0 && required===14 && formTarget==='_self','HTTP='+cRes?.status()+' required='+required+' falseError='+falseError+' target='+formTarget);
  const fields=controle.locator('#clinical-form .field-card');
  for(let i=0;i<await fields.count();i++) {
    const field=fields.nth(i);
    const sel=field.locator('select');
    if(await sel.count()){await sel.selectOption({index:1});continue}
    const input=field.locator('input').first();
    if(!(await input.count()))continue;
    const type=await input.getAttribute('type');
    const name=await input.getAttribute('name');
    let val=marker;
    if(type==='email')val='e2e-clinico-'+String(process.env.GITHUB_RUN_ID||'1')+'@example.com';
    if(type==='number')val='30';
    if(type==='date')val='1996-01-02';
    if(type==='tel')val='0000000000';
    if(name==='entry.1790168993')val='00000000000';
    if(name==='entry.1718829325')val='NAO E DOCUMENTO';
    if(name==='entry.1311239845')val='ENDERECO FICTICIO NAO REAL';
    await input.fill(val);
  }
  const progress=await controle.locator('#progress-count').innerText();
  const valid=await controle.locator('#clinical-form').evaluate(el=>el.checkValidity());
  log('controle-validacao',valid && /14 de 14/.test(progress),'required='+progress+' valid='+valid);
  if(valid && process.env.LIVE_SYNTHETIC_SUBMISSION==='1' && process.env.SKIP_CONTROL_SUBMISSION!=='1'){
    await controle.locator('.submit-btn').click({timeout:10000});
    await controle.waitForTimeout(8000);
    const current=controle.url();
    const body=await controle.locator('body').innerText().catch(()=> '');
    const accepted=/your response has been recorded|sua resposta foi registrada|a sua resposta foi registrada|resposta.*registrad|response has been recorded|sua resposta foi enviada/i.test(body);
    log('controle-envio',accepted,'domain='+new URL(current).hostname+' formResponse='+current.includes('formResponse')+' receipt='+accepted+' heading='+body.slice(0,120).replace(/\s+/g,' '));
  }
  await controle.close();
  const anamnese=await context.newPage();
  const aRes=await anamnese.goto(base+'anamnese.html?test=1',{waitUntil:'domcontentloaded',timeout:45000});
  await anamnese.waitForSelector('#formCard .field',{timeout:20000});
  log('anamnese-render',aRes?.status()===200,'HTTP='+aRes?.status());
  const fallbackVisible=await anamnese.locator('#officialFormFallback:not(.hidden)').count();
  const oldWizardHidden=await anamnese.locator('#anamneseForm.hidden').count();
  const officialLink=await anamnese.locator('#officialFormLink').getAttribute('href');
  log('anamnese-contingencia',fallbackVisible===1 && oldWizardHidden===1 && officialLink.includes('/forms/d/e/'),'fallback='+fallbackVisible+' wizardHidden='+oldWizardHidden);
  let countSteps=0; let sent=false; let failure='';
  if(!fallbackVisible){
  for(let k=0;k<20;k++){
    const fields=anamnese.locator('#formCard .field');
    for(let i=0;i<await fields.count();i++){
      const field=fields.nth(i);
      const type=await field.getAttribute('data-type');
      const title=await field.getAttribute('data-title');
      if(type==='text' || type==='paragraph'){
        const control=field.locator('input[type="text"]:not([data-other-for]),textarea').first();
        if(await control.count()){
          let val=(await control.getAttribute('required'))!==null?'TESTE TECNICO - NAO E PACIENTE':'';
          if(title==='Nome completo')val=marker;
          if(title==='Idade')val='30';
          if(val)await control.fill(val);
        }
      } else if(type==='choice'||type==='scale'){
        const options=field.locator('input[type="radio"]');
        const no=field.locator('input[type="radio"][value="Não"]');
        if(await no.count())await no.first().evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
        else if(await options.count())await options.first().evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
      } else if(type==='check'){
        const checkbox=field.locator('input[type="checkbox"]');
        if(await checkbox.count())await checkbox.first().evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
      }
    }
    const button=anamnese.locator('#nextBtn');
    if(!(await button.count())){failure='botao ausente';break}
    const label=await button.innerText();
    await button.click();
    countSteps++;
    if(label.includes('Enviar')){
      sent=true; break;
    }
    await anamnese.waitForTimeout(80);
  }
  log('anamnese-etapas',sent && countSteps>=8,'steps='+countSteps+' submitClicked='+sent+' '+failure);
  }
  if(sent&&process.env.LIVE_SYNTHETIC_SUBMISSION==='1'){
    const success=await anamnese.locator('#successPanel:not(.hidden)').waitFor({timeout:45000}).then(()=>true).catch(()=>false);
    const err=await anamnese.locator('#submitStatus').innerText().catch(()=> '');
    log('anamnese-envio',success,'serverReceipt='+success+' '+(!success?err.slice(0,130):''));
  }
  await anamnese.close();
} catch(err){log('runner-error',false,String(err?.message||err).slice(0,400));}
finally{await browser.close();}
const mandatory=['controle-render','controle-validacao','anamnese-render','anamnese-contingencia'];
const writeChecks=process.env.LIVE_SYNTHETIC_SUBMISSION==='1'?[...(process.env.SKIP_CONTROL_SUBMISSION==='1'?[]:['controle-envio'])]:[];
const failed=[...mandatory,...writeChecks].filter(stage=>!output.some(x=>x.stage===stage&&x.ok===true));
console.log('RESULT '+JSON.stringify({marker,failed}));
if(failed.length)process.exitCode=1;
