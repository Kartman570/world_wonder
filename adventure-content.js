import {ITEMS,ROLES,TRADE} from './content.js';
const item=(name,icon,price)=>({name,icon,price});
Object.assign(ITEMS,{
 grain:item('Зерно','♧',3),hops:item('Хмель','❧',4),flour:item('Мука','▱',6),bread:item('Деревенский хлеб','▰',10),honey:item('Лесной мёд','⬢',12),wax:item('Пчелиный воск','⬡',7),leather:item('Выделанная кожа','◈',18),ingot:item('Железный слиток','▰',18),nails:item('Гвозди','†',5),planks:item('Доски','▥',10),rope:item('Льняная верёвка','∞',9),bandage:item('Чистые бинты','✚',14),medicine:item('Травяная мазь','✥',28),torch:item('Походный факел','♨',16),campKit:item('Свёрнутый лагерь','⌂',65),jerky:item('Вяленое мясо','◆',14),stew:item('Горячая похлёбка','♜',20),tools:item('Набор инструментов','⚒',55),travelCoat:item('Укреплённый плащ','♧',75),shield:item('Деревянный щит','◐',65),salve:item('Медовая повязка','✚',22)
});
Object.assign(ROLES,{grainFarmer:'Хлебороб',miller:'Мельник',baker:'Пекарь',brewer:'Пивовар',beekeeper:'Пасечник',tanner:'Дубильщик',healer:'Лекарь',captive:'Пленный подмастерье'});
const extend=(role,buy,sell)=>{TRADE[role].buys=[...new Set([...TRADE[role].buys,...buy])];TRADE[role].sells=[...new Set([...TRADE[role].sells,...sell])];};
extend('cook',['grain','flour','honey','hops','bread','jerky','stew'],['bread','ale','jerky','stew']);
extend('farmerTrader',['grain','hops','honey','wax'],['grain','hops','honey','wax']);extend('herbalist',['honey','wax','cloth'],['bandage','medicine','salve']);
extend('smith',['ingot','nails','tools','planks'],['ingot','nails','tools']);extend('tailor',['rope','leather'],['rope','bandage','travelCoat']);
extend('leatherworker',['leather','wax'],['leather','travelCoat']);extend('armorer',['ingot','leather','planks'],['shield','armor','travelCoat']);
extend('provisioner',['bread','jerky','torch','rope'],['bread','jerky','torch','campKit','rope']);extend('merchant',['bread','flour','grain','hops','honey','wax','leather'],['bread','flour','grain','hops','honey','wax','leather']);
export const SKILLS={craft:'Ремесло',cooking:'Кулинария',medicine:'Травничество',survival:'Выживание',smithing:'Кузнечное дело'};
export const STATIONS={field:'Вручную',fire:'Очаг или лагерь',forge:'Кузница',loom:'Ткацкая мастерская',bench:'Мастерская / склад',mortar:'Травная лавка',tannery:'Кожевенная мастерская'};
const recipe=(id,name,input,output,skill,station,seconds,level=1)=>({id,name,input,output,skill,station,seconds,level});
export const RECIPES=[
 recipe('rope','Сплести верёвку',{fiber:3},{rope:1},'craft','field',4),
 recipe('bandage','Нарезать чистые бинты',{cloth:1},{bandage:2},'medicine','field',4),
 recipe('salve','Медовая повязка',{herb:1,honey:1,cloth:1},{salve:2},'medicine','field',6),
 recipe('torch','Сделать факел',{log:1,cloth:1,wax:1},{torch:2},'survival','field',5),
 recipe('planks','Расколоть доски',{log:2},{planks:3},'craft','field',7),
 recipe('camp','Собрать походный лагерь',{log:3,cloth:2,rope:2},{campKit:1},'survival','field',10),
 recipe('jerky','Высушить мясо',{meat:2},{jerky:3},'cooking','fire',9),
 recipe('fish','Запечь рыбу',{fish:2,herb:1},{ration:3},'cooking','fire',7),
 recipe('stew','Сварить похлёбку',{meat:1,herb:1,grain:1},{stew:2},'cooking','fire',8),
 recipe('bread','Испечь хлеб',{flour:2,honey:1},{bread:4},'cooking','fire',10),
 recipe('flour','Смолоть муку',{grain:3},{flour:2},'craft','bench',7),
 recipe('cloth','Соткать полотно',{fiber:3},{cloth:1},'craft','loom',8),
 recipe('leather','Выделать шкуры',{hide:2},{leather:2},'craft','tannery',12),
 recipe('ingot','Выплавить слиток',{ore:2,log:1},{ingot:1},'smithing','forge',10),
 recipe('nails','Выковать гвозди',{ingot:1},{nails:8},'smithing','forge',8),
 recipe('arrows','Сделать стрелы',{planks:1,nails:2},{arrow:16},'craft','bench',8),
 recipe('medicine','Приготовить мазь',{herb:3,honey:1},{medicine:2},'medicine','mortar',10),
 recipe('tools','Собрать инструменты',{ingot:2,planks:1,rope:1},{tools:1},'smithing','forge',12,2),
 recipe('shield','Скрепить щит',{planks:3,leather:1,nails:4},{shield:1},'craft','bench',12,2),
 recipe('coat','Укрепить дорожный плащ',{cloth:3,leather:2,wax:1},{travelCoat:1},'craft','loom',14,2),
 recipe('axe','Выковать топор',{ingot:2,planks:1},{axe:1},'smithing','forge',12,2),
 recipe('hammer','Выковать молот',{ingot:3,planks:1},{hammer:1},'smithing','forge',14,2)
];
export const INDUSTRIES={
 miller:{name:'Мельничная артель',room:'warehouse',prop:'millstone',recipe:'flour',inputs:['grain'],outputs:['flour'],time:12},
 baker:{name:'Пекарня',room:'inn',prop:'breadOven',recipe:'bread',inputs:['flour','honey'],outputs:['bread'],time:18},
 brewer:{name:'Пивоварня',room:'inn',prop:'brewVat',input:{grain:2,hops:1},output:{ale:4},inputs:['grain','hops'],outputs:['ale'],time:24},
 tanner:{name:'Дубильня',room:'leatherworks',prop:'tanningFrame',recipe:'leather',inputs:['hide'],outputs:['leather'],time:20},
 healer:{name:'Лекарская',room:'apothecary',prop:'herbDryer',recipe:'medicine',inputs:['herb','honey'],outputs:['medicine'],time:22}
};
export const USE_EFFECTS={bread:{hp:20,stamina:55},jerky:{hp:25,stamina:75},stew:{hp:40,stamina:100},bandage:{hp:22},salve:{hp:35},medicine:{hp:60}};
