import {validRecipe,type Recipe} from './colorEngine';
export function load<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)??'null')??fallback;}catch{return fallback;}}
export function save(key:string,value:unknown):boolean{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function loadRecipes():Recipe[]{const v=load<unknown>('cc-recipes',[]);return Array.isArray(v)?v.filter(r=>validRecipe(r)).slice(0,50):[];}
export function hasSession(){try{return !!localStorage.getItem('cc-session');}catch{return false;}}
