import postcss from 'postcss';
import {parse,walk} from 'css-tree';
export function validateCss(css,filename='style.css') {
 const ast=parse(css,{positions:true,parseRulePrelude:true,parseValue:true,parseCustomProperty:true,onParseError:e=>{throw e;}});
 walk(ast,node=>{if(node.type==='Raw')throw Error(`${filename}: unparsed CSS at ${node.loc?.start.line}`);});
 return ast;
}
export function offlineCss(css) {
 const root=postcss.parse(css);
 root.walkAtRules('import',rule=>rule.remove());
 const output=root.toString();validateCss(output,'PLAY.html');return output;
}
