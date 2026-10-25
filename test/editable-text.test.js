import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const [app,editing,styles]=await Promise.all(['app.js','inline-editing.js','text-styles.js'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')));
const context=vm.createContext({expandEditableTextVariables:value=>value,escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),escapeAttribute:value=>value});
vm.runInContext(styles,context);
vm.runInContext(app.slice(app.indexOf('function safeEditableLink('),app.indexOf('function editableTextVariables()')),context);
vm.runInContext(editing,context);
const format=(value,options)=>context.formatEditableText(value,options);
test('shared formatting preserves single and repeated blank lines, including Markdown and lists',()=>{
 assert.equal(format('First\n\nSecond'),'<p>First</p><br><p>Second</p>');
 assert.equal(format('First\n\n\nSecond'),'<p>First</p><br><br><p>Second</p>');
 assert.equal(format('**First**\n\n_Second_'),'<p><strong>First</strong></p><br><p><em>Second</em></p>');
 assert.equal(format('- One\n\n- Two'),'<ul><li>One</li></ul><br><ul><li>Two</li></ul>');
 assert.equal(format(' \n\n'),'');
 assert.doesNotMatch(format('<script>\n\nNext'),/<script>/);
});
function root(){
 const wrapper={tagName:'DIV',id:''},header={tagName:'DIV',id:''},container={id:'rsvpEventHeader'},paragraph={tagName:'P',id:'',innerHTML:'Original'};
 const result={matches:selector=>selector==='dialog',querySelectorAll:()=>[paragraph]};
 paragraph.closest=selector=>selector==='dialog'?result:null;paragraph.querySelector=()=>null;paragraph.matches=()=>false;
 paragraph.parentElement=wrapper;wrapper.parentElement=header;header.parentElement=container;
 wrapper.querySelectorAll=()=>[paragraph];header.querySelectorAll=()=>[wrapper];container.querySelectorAll=()=>[header];
 return {result,paragraph};
}
test('saved first-page text reapplies to rebuilt RSVP headers with editing turned off',()=>{
 const key='#rsvpEventHeader>div:nth-of-type(1)>div:nth-of-type(1)>p:nth-of-type(1)';
 const state={siteText:{[key]:'Edited first page\n\nKeep this blank line'}};
 for(let reopened=0;reopened<3;reopened++){
  const {result,paragraph}=root();
  context.SiteEditing.applyStaticText(result,state,format);
  assert.equal(paragraph.innerHTML,'Edited first page<br><br>Keep this blank line');
 }
 const other=root();context.SiteEditing.applyStaticText(other.result,{siteText:{}},format);assert.equal(other.paragraph.innerHTML,'Original');
});

vm.runInContext(editing.slice(editing.indexOf('  function formatTextSelection('),editing.indexOf('  function editTitle(')),context);
test('formatting controls produce supported text while retaining selected line breaks',()=>{
 const apply=(kind,text)=>context.formatTextSelection(kind,text);
 assert.equal(format(apply('bold','Welcome')),'<p><strong>Welcome</strong></p>');
 assert.equal(format(apply('italic','Welcome')),'<p><em>Welcome</em></p>');
 assert.equal(format(apply('code','Welcome')),'<p><code>Welcome</code></p>');
 assert.equal(format(apply('bullets','One\nTwo')),'<ul><li>One</li><li>Two</li></ul>');
 assert.equal(format(apply('numbers','One\nTwo')),'<ol><li>One</li><li>Two</li></ol>');
 assert.match(format(apply('link','Details')),/<a href="https:\/\/example.com">Details<\/a>/);
 assert.equal(apply('bold',''),'**Text**');
});

test('italic works across selected lines, toggles off, and combines with bold',()=>{
 const apply=(kind,text)=>context.formatTextSelection(kind,text);
 const italic=apply('italic','First line\n\nSecond line');
 assert.equal(format(italic),'<p><em>First line</em></p><br><p><em>Second line</em></p>');
 assert.equal(format('*First line\n\nSecond line*'),'<p><em>First line</em></p><br><p><em>Second line</em></p>');
 assert.equal(apply('italic',italic),'First line\n\nSecond line');
 assert.equal(format(apply('italic',apply('bold','Welcome'))),'<p><strong><em>Welcome</em></strong></p>');
 assert.equal(format('***Welcome***'),'<p><strong><em>Welcome</em></strong></p>');
 assert.equal(format(apply('italic','  Welcome  ')),'<p>  <em>Welcome</em>  </p>');
});

test('shared formatting handles mixed styles, literal code, lists, links, and unsafe text',()=>{
 assert.equal(format('**Bold** and *italic* and _italic_'),'<p><strong>Bold</strong> and <em>italic</em> and <em>italic</em></p>');
 assert.equal(format('***Both*** and ___both___'),'<p><strong><em>Both</em></strong> and <strong><em>both</em></strong></p>');
 assert.equal(format('`**literal** _code_ <script>`'),'<p><code>**literal** _code_ &lt;script&gt;</code></p>');
 assert.equal(format('- **First**\n- *Second*\n\n1. Third'),'<ul><li><strong>First</strong></li><li><em>Second</em></li></ul><br><ol><li>Third</li></ol>');
 assert.equal(format('[*Details*](https://example.com)'),'<p><a href="https://example.com"><em>Details</em></a></p>');
 assert.doesNotMatch(format('[Click](javascript:alert)\n<script>'),/<script>|href="javascript:/);
 for(const kind of ['bold','italic','code']){
  const selected='First\n\nSecond';const markup=context.formatTextSelection(kind,selected);
  const html=format(markup);assert.ok(html.includes('<br>'));assert.doesNotMatch(html,/\*/);
 }
});

test('RSVP time and multiline address render formatting inside a larger text field',()=>{
 const text="**TWO O'CLOCK IN THE AFTERNOON**\n*221 W China Grade Loop, Bldg A\nBakersfield CA 93308*\nKindly RSVP by DATE";
 assert.equal(format(text),"<p><strong>TWO O'CLOCK IN THE AFTERNOON</strong></p><p><em>221 W China Grade Loop, Bldg A</em></p><p><em>Bakersfield CA 93308</em></p><p>Kindly RSVP by DATE</p>");
 assert.equal(format('Before\n**First\nSecond**\nAfter'),'<p>Before</p><p><strong>First</strong></p><p><strong>Second</strong></p><p>After</p>');
 assert.equal(format('Before\n_Address\n\nCity_\nAfter'),'<p>Before</p><p><em>Address</em></p><br><p><em>City</em></p><p>After</p>');
});

test('one formatter handles both page blocks and inline text without changing blank lines',()=>{
 const copy="**Time**\n*Street\nCity*\n\nDetails";
 assert.equal(format(copy),'<p><strong>Time</strong></p><p><em>Street</em></p><p><em>City</em></p><br><p>Details</p>');
 assert.equal(format(copy,{inline:true}),'<strong>Time</strong><br><em>Street</em><br><em>City</em><br><br>Details');
 assert.equal(context.formatWeddingPartyDescription(copy),format(copy));
 assert.doesNotMatch(format('<script>',{inline:true}),/<script>/);
});

test('selected fonts and sizes share the safe renderer with Markdown and links',()=>{
 const style=(text,values)=>context.TextStyles.mark(text,values);
 assert.equal(format(style('Hello',{font:'Georgia'})),"<p><span style=\"font-family:'Georgia'\">Hello</span></p>");
 assert.match(format(style('Hello',{size:'24'})),/font-size:calc\(24px \* var\(--fitted-text-scale,1\)\)/);
 const nested=style(style('Word',{font:'Times New Roman'}),{size:20});
 assert.match(format('**Before '+nested+' after**'),/<strong>Before <span[^>]+><span[^>]+>Word<\/span><\/span> after<\/strong>/);
 assert.match(format('[Read '+style('this',{font:'Verdana'})+'](https://example.com)'),/<a href="https:\/\/example.com">Read <span[^>]+>this<\/span><\/a>/);
 assert.match(format(style('[Link](https://example.com)',{font:'Arial'})),/<span[^>]+><a href="https:\/\/example.com">Link<\/a><\/span>/);
 assert.match(format(style('First\n\nSecond',{font:'Georgia',size:18})),/<\/span><\/p><br><p><span/);
 assert.equal(format('`{{style:font=Georgia}}literal{{/style}}`'),'<p><code>{{style:font=Georgia}}literal{{/style}}</code></p>');
});
test('font formatting refuses unsafe CSS and cannot inject markup into links',()=>{
 for(const values of [{font:'Arial\" onmouseover=evil'},{size:'20;background:red'},{size:200},{color:'red'}])assert.equal(context.TextStyles.mark('Keep',values),'Keep');
 const input='{{style:font=Arial\" onmouseover=evil}}Text{{/style}}';
 assert.doesNotMatch(format(input),/<span|onmouseover="evil/);
 assert.doesNotMatch(format('[Link](https://example.com/{{style:size=20}}x{{/style}})'),/<span/);
 assert.equal(format('{{style:font=Georgia}}Text'),"<p><span style=\"font-family:'Georgia'\">Text</span></p>");
});

test('styled map addresses keep formatting out of their URL and title attributes',()=>{
 const styled=context.TextStyles.mark('Main Street',{font:'Georgia',size:20});
 const result=format('<123 '+styled+'>');
 assert.match(result,/href="geo:0,0\?q=123%20Main%20Street" title="Open 123 Main Street in your maps app"/);
 assert.match(result,/>123 <span[^>]+>Main Street<\/span><\/a>/);
});

test('selected text colors, highlights and borders use only safe hex styling',()=>{
 const style=context.TextStyles.mark('Chosen',{color:'#123456',highlight:'#ffee0080',border:'#998877'});
 const html=format('Before '+style+' after');
 assert.match(html,/color:#123456/);assert.match(html,/background-color:#ffee0080/);assert.match(html,/border:1px solid #998877/);assert.match(html,/Before <span[^>]*>Chosen<\/span> after/);
 assert.equal(context.TextStyles.mark('Safe',{color:'#fff;position:fixed'}),'Safe');
});
test('formatting on a count follows changing live numbers rather than saving the old value',()=>{
 const mark=context.TextStyles.mark('13',{color:'#123456'})+'/2';
 const next=context.TextStyles.rebase(mark,'13/2','142/8');assert.match(next,/142\{\{\/style\}\}\/8$/);assert.doesNotMatch(next,/>13|\}\}13/);
 const all=context.TextStyles.mark('13/2',{font:'Georgia'});assert.match(context.TextStyles.rebase(all,'13/2','142/81'),/142\/81\{\{\/style\}\}$/);
});

test('underlined text uses the shared safe style renderer',()=>{
 assert.match(format(context.TextStyles.mark('Underlined',{underline:'true'})),/text-decoration:underline/);
 assert.equal(context.TextStyles.mark('Safe',{underline:'true;position:fixed'}),'Safe');
});
