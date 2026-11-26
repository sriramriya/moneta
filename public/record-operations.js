import {asOfBalance,validateWorkspace,upgrade} from './ledger.js';
export const recoveryDays=30;
export const recoveryTransactions=r=>r.transactions||[r.transaction];
export const recoveryExpiry=r=>new Date(Date.parse(r.deletedAt)+recoveryDays*86400000).toISOString();
export function dependencies(s,kind,id){
 const all=[...s.transactions,...s.trash.flatMap(recoveryTransactions)];
 if(kind==='accounts')return [...all.filter(t=>t.account===id||t.to===id),...s.cards.filter(c=>c.account===id),...s.schedules.filter(q=>q.account===id||q.to===id),...s.investmentTrades.filter(t=>t.account===id||t.cashAccount===id),...s.valuations.filter(v=>v.account===id),...s.debts.filter(d=>d.account===id),...s.reconciliations.filter(r=>r.account===id)];
 if(kind==='cards')return all.filter(t=>t.card===id);
 if(kind==='schedules')return [...s.scheduleRuns.filter(r=>r.schedule===id||r.key?.startsWith(id+':')),...all.filter(t=>t.scheduleKey?.startsWith(id+':'))];
 return [];
}
export function archiveRecord(s,kind,id,archive=true){const r=s[kind]?.find(r=>r.id===id);if(!r)throw Error('Record not found.');r.archived=archive;if(kind==='cards'){r.status=archive?'closed':'active';if(!archive)r.removed=false}if(kind==='schedules')r.status=archive?'ended':'paused';return r}
export function removeRecord(s,kind,id){const r=s[kind]?.find(r=>r.id===id);if(!r)throw Error('Record not found.');
 if(kind==='accounts'&&(dependencies(s,kind,id).length||r.opening!==0||asOfBalance(s,id)!==0))throw Error('This account has a balance or linked history. Archive it instead; its history and financial totals will remain.');
 if(kind==='cards'&&dependencies(s,kind,id).length){r.archived=true;r.removed=true;r.status='closed';return {retained:true}}
 if(kind==='schedules'&&dependencies(s,kind,id).length)throw Error('This schedule has processed occurrences or transaction history. End or archive it instead.');
 if(kind==='goals'&&(r.saved>0||r.contributions?.length))throw Error('This goal has savings allocations. Archive it to preserve their history. No bank money is moved.');
 if(kind==='debts'&&r.account){const linked=dependencies(s,'accounts',r.account).filter(x=>x!==r),account=s.accounts.find(a=>a.id===r.account);if(linked.length||account?.opening||asOfBalance(s,r.account)!==0)throw Error('This loan has a liability or linked repayments. Archive it and retain its ledger history.');s.accounts=s.accounts.filter(a=>a.id!==r.account)}
 if(!['accounts','cards','budgets','goals','schedules','bills','debts'].includes(kind))throw Error('Deletion is not supported for this record type.');s[kind]=s[kind].filter(x=>x.id!==id);return {removed:true};
}
export function validateTransition(prior,next,{replaceBackup=false,now=new Date().toISOString()}={}){
 prior=upgrade(prior);
 for(const key of ['accounts','cards','budgets','goals','bills','debts','schedules'])for(const r of next[key])if(r.archived!==undefined&&typeof r.archived!=='boolean')throw Error('Invalid archive status.');
 if(replaceBackup)return;
 const ids=new Set();for(const t of [...next.transactions,...next.trash.flatMap(recoveryTransactions)]){if(ids.has(t.id))throw Error('A transaction cannot appear twice in active records or Recovery.');ids.add(t.id)}
 for(const card of prior.cards){const updated=next.cards.find(c=>c.id===card.id);if(updated&&updated.account!==card.account)throw Error('A debit card’s historical bank link cannot change. Create a new linked card instead.');}
 for(const a of prior.accounts){const n=next.accounts.find(x=>x.id===a.id);if(n&&n.currency!==a.currency)throw Error('An account’s original currency cannot change.');if(!n){const check=structuredClone(prior);removeRecord(check,'accounts',a.id)}}
 for(const key of ['cards','goals','schedules','debts'])for(const r of prior[key])if(!next[key].some(x=>x.id===r.id)){const check=structuredClone(prior);removeRecord(check,key,r.id);if(check[key].some(x=>x.id===r.id))throw Error('Retain the historical debit-card reference when removing this card.')}
 const historical=new Map([...prior.transactions,...prior.trash.flatMap(recoveryTransactions)].map(t=>[t.id,t]));
 for(const key of ['valuations','investmentTrades','cards','schedules','reconciliations'])for(const r of next[key]){const old=prior[key].find(x=>x.id===r.id);for(const aid of [r.account,r.cashAccount,r.to].filter(Boolean))if(next.accounts.find(a=>a.id===aid)?.archived&&!(old&&[old.account,old.cashAccount,old.to].includes(aid)))throw Error('Restore the archived account before adding linked records.');}
 for(const t of next.transactions){const old=historical.get(t.id);if(old&&old.currency!==t.currency)throw Error('A historical transaction’s currency cannot change.');for(const account of [t.account,t.to].filter(Boolean)){if(next.accounts.find(a=>a.id===account)?.archived&&!(old&&(old.account===account||old.to===account)))throw Error('Restore the archived account before adding new records.')}if(t.card){const card=next.cards.find(c=>c.id===t.card);if((card?.archived||card?.removed||card?.status!=='active')&&old?.card!==t.card)throw Error('Choose an active debit card or record against the bank account without a card.')}if(old?.group&&['amount','date','account','to','type','group'].some(k=>old[k]!==t[k]))throw Error('Linked repayment amounts and dates must be corrected together. Reverse the payment in Recovery, then record its corrected components.');}
 const remaining=new Set(next.transactions.map(t=>t.id)),trashIds=new Set(next.trash.flatMap(recoveryTransactions).map(t=>t.id));
 for(const r of next.trash)for(const t of recoveryTransactions(r))if(t.group){const ids=new Set(recoveryTransactions(r).map(x=>x.id));if(prior.transactions.filter(x=>x.group===t.group).some(x=>!ids.has(x.id)))throw Error('Keep linked repayment components in one Recovery item.');}
 for(const t of prior.transactions)if(!remaining.has(t.id)){if(!trashIds.has(t.id))throw Error('Move transactions to Recovery before permanent deletion.');if(t.investmentTrade)throw Error('Investment trade cash flows must retain their linked trade.');if(t.group&&prior.transactions.filter(x=>x.group===t.group).some(x=>remaining.has(x.id)))throw Error('Delete every component of the linked repayment together.');}
 const previousTrash=new Map(prior.trash.map(r=>[r.id,r]));for(const r of next.trash){const old=previousTrash.get(r.id);if(old){if(JSON.stringify(recoveryTransactions(old))!==JSON.stringify(recoveryTransactions(r)))throw Error('Recovery records cannot be edited.');r.deletedAt=old.deletedAt}else{const originals=recoveryTransactions(r);if(!originals.length||originals.some(t=>!prior.transactions.some(p=>p.id===t.id&&JSON.stringify(p)===JSON.stringify(t))))throw Error('Recovery must retain the exact deleted transaction.');r.deletedAt=now}r.expiresAt=recoveryExpiry(r);}
 for(const r of prior.trash){const restored=recoveryTransactions(r).filter(t=>remaining.has(t.id));if(restored.length){if(restored.length!==recoveryTransactions(r).length)throw Error('Restore all linked components together.');if(restored.some(t=>JSON.stringify(next.transactions.find(x=>x.id===t.id))!==JSON.stringify(t)))throw Error('Restore the original record before editing it.');if(Date.parse(now)>=Date.parse(recoveryExpiry(r)))throw Error('The 30-day recovery period has ended. Retain an export and review a new transaction instead.');}}
 validateWorkspace(next);
}
