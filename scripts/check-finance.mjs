import {readdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';
for(const directory of ['public','lib'])for(const filename of readdirSync(directory))if(filename.endsWith('.js'))execFileSync(process.execPath,['--check',directory+'/'+filename],{stdio:'inherit'});
console.log('All financial frontend and shared server JavaScript passed syntax checks.');
