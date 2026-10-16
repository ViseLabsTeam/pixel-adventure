import {animationTimings} from '@umbral/content';
import type {Game,Action} from '@umbral/core';
export function animationDuration(previous:Game,next:Game,action:Action,playerId:string|null){
 const player=previous.players.find(p=>p.id===playerId);
 if(player && action.type==='MOVE_STEP'){
 const clips=animationTimings[player.classId];
 return player.classId==='paladin' && action.direction==='UP' ? animationTimings.paladin.walkUp : 'walk' in clips ? clips.walk : 790;
 }
 if(player && action.type==='ATTACK')return animationTimings[player.classId][action.ability??'basic'];
 const oldIds=new Set(previous.events.map(e=>e.id));
 return next.events.some(e=>!oldIds.has(e.id)&&e.actorId&&e.targetId) ? 850 : 0;
}
