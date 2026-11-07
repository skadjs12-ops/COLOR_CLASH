import {useEffect,useRef} from 'react';
export function useMusic(track:'menu'|'battle',enabled:boolean,volume:number){
 const player=useRef<HTMLAudioElement|null>(null);
 const activated=useRef(false);
 const settings=useRef({enabled,volume});
 settings.current={enabled,volume};
 useEffect(()=>{
  const audio=new Audio(track==='battle'?'/audio/battle.mp3':'/audio/menu.mp3');audio.loop=true;audio.volume=volume;
  audio.hidden=true;audio.setAttribute('aria-label','배경 음악 플레이어');document.body.append(audio);
  player.current=audio;
  const play=()=>{
   activated.current=true;
   if(settings.current.enabled&&!document.hidden)void audio.play().catch(()=>{});
  };
  const visibility=()=>{if(document.hidden)audio.pause();else if(activated.current)play();};
  document.addEventListener('pointerdown',play);
  document.addEventListener('keydown',play);
  document.addEventListener('visibilitychange',visibility);
  if(activated.current&&settings.current.enabled&&!document.hidden)void audio.play().catch(()=>{});
  return ()=>{audio.pause();audio.removeAttribute('src');audio.load();audio.remove();player.current=null;document.removeEventListener('pointerdown',play);document.removeEventListener('keydown',play);document.removeEventListener('visibilitychange',visibility);};
 },[track]);
 useEffect(()=>{
  const audio=player.current;if(!audio)return;
  audio.volume=volume;
  if(!enabled)audio.pause();
  else if(activated.current&&!document.hidden)void audio.play().catch(()=>{});
 },[enabled,volume]);
}
