import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
const pages = [['/el-salvador/','hub'],['/el-salvador/tourism/','tourism'],['/es/el-salvador/startups-y-emprendedores/','startups-es'],['/el-salvador/organizations/surfing-esa/','entry'],['/el-salvador/people/salvador-ramirez/','person'],['/developers/','dev']];
for (const [p,n] of pages) {
  for (const [w,h,s] of [[1280,900,'d'],[390,844,'m']]) {
    const pg = await b.newPage({viewport:{width:w,height:h}});
    await pg.goto('http://127.0.0.1:8788'+p,{waitUntil:'networkidle'}).catch(e=>console.log('err',p,e.message));
    await pg.screenshot({path:`/tmp/s-${n}-${s}.png`, fullPage: s==='d'});
    const ov = await pg.evaluate(()=>document.documentElement.scrollWidth - window.innerWidth);
    console.log(n,s,'overflow',ov);
    await pg.close();
  }
}
await b.close();
