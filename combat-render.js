import {WEAPONS,lockedTarget} from './combat.js';
export function drawCombatAim(c,w){const p=w.player;if(!p.weaponDrawn||!p.weapon)return;const target=WEAPONS[p.weapon]?.ranged?lockedTarget(w):null,angle=target?Math.atan2(target.y-p.y,target.x-p.x):(p.aimAngle||0),config=WEAPONS[p.weapon];if(!config)return;
 c.save();c.strokeStyle='#e2c88366';c.lineWidth=1.2;
 if(config.ranged){const length=target?Math.hypot(target.x-p.x,target.y-p.y):Math.min(config.range,p.aimPoint?Math.hypot(p.aimPoint.x-p.x,p.aimPoint.y-p.y):400),x=p.x+Math.cos(angle)*length,y=p.y+Math.sin(angle)*length-30;c.setLineDash([5,7]);c.beginPath();c.moveTo(p.x,p.y-30);c.lineTo(x,y);c.stroke();c.setLineDash([]);c.strokeStyle='#e4d59f';c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.moveTo(x-14,y);c.lineTo(x-5,y);c.moveTo(x+5,y);c.lineTo(x+14,y);c.moveTo(x,y-14);c.lineTo(x,y-5);c.moveTo(x,y+5);c.lineTo(x,y+14);c.stroke();}
 else{c.beginPath();c.moveTo(p.x,p.y-8);c.arc(p.x,p.y-8,config.range,angle-config.arc,angle+config.arc);c.closePath();c.fillStyle=p.pendingStrike?'#e2c88325':'#e2c88309';c.fill();c.stroke();}
 c.restore();}
