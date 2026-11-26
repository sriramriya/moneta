import {spent} from './core.js';
import {cashKinds,asOfBalance} from './ledger.js';

export function hasInvestments(s){return s.accounts.some(a=>a.kind==='investment')||s.investmentTrades.length>0||s.valuations.length>0}
export function desktopDestinations(s){return ['Overview','Transactions','Budget Planner','Savings Goals',...(hasInvestments(s)?['Investments']:[]),...(s.transactions.length?['Analytics']:[]),'More']}
export function totalBalance(s,currency,date){return s.accounts.filter(a=>cashKinds.includes(a.kind)&&a.currency===currency).reduce((n,a)=>n+asOfBalance(s,a.id,date),0)}
export function budgetLeft(s,currency,start,end){const budgets=s.budgets.filter(b=>!b.archived&&b.currency===currency&&b.start<=end&&b.end>=start).map(b=>({...b,left:b.amount-spent(s.transactions,b.name,b.start,b.end,currency)}));return {budgets,left:budgets.reduce((n,b)=>n+b.left,0)}}
const rules=[[/\b(grocery|groceries|supermarket|whole foods|aldi|tesco)\b/i,'Groceries'],[/\b(rent|mortgage|housing)\b/i,'Housing'],[/\b(bus|train|metro|transit|uber|lyft|fuel|petrol)\b/i,'Transport'],[/\b(restaurant|cafe|coffee|takeaway|dining)\b/i,'Dining'],[/\b(electricity|water bill|power bill|internet|utility|utilities)\b/i,'Utilities'],[/\b(salary|payroll|wages)\b/i,'Salary']];
export function suggestCategory(merchant){return rules.find(([pattern])=>pattern.test(String(merchant||'')))?.[1]||'Uncategorized'}
