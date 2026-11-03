/* Motor do site — interpreta o modelo (template) e desenha com React.
   Não editar: o conteúdo vem da planilha (ver conteudo.js / config.js). */
(function () {
  'use strict';
  var R = window.React;
  var h = R.createElement;

  // ---------- utilidades ----------
  var exprCache = {};
  function compileExpr(src) {
    if (exprCache[src]) return exprCache[src];
    var fn;
    try { fn = new Function('$s', 'with($s){return (' + src + ');}'); }
    catch (e) { console.warn('[motor] expressão inválida:', src); fn = function () { return undefined; }; }
    return (exprCache[src] = fn);
  }
  function evalExpr(src, scope) {
    try { return compileExpr(src)(scope); } catch (e) { return undefined; }
  }
  var BIND = /\{\{\s*([\s\S]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([\s\S]+?)\s*\}\}\s*$/;
  function hasBind(s) { return s && s.indexOf('{{') >= 0; }
  function interp(s, scope) {
    return s.replace(BIND, function (_, e) { var v = evalExpr(e, scope); return v == null ? '' : String(v); });
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  // estilo "a:b;c:d" -> objeto React (respeita parênteses e aspas)
  function parseStyle(str) {
    var out = {}, buf = '', depth = 0, q = null, parts = [];
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (q) { if (ch === q) q = null; buf += ch; continue; }
      if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ';' && depth === 0) { parts.push(buf); buf = ''; continue; }
      buf += ch;
    }
    parts.push(buf);
    parts.forEach(function (p) {
      var k = p.indexOf(':'); if (k < 0) return;
      var name = p.slice(0, k).trim(), val = p.slice(k + 1).trim();
      if (!name) return;
      if (name.indexOf('--') === 0) out[name] = val;
      else {
        var key = camel(name);
        if (/^-(webkit|moz|ms)-/.test(name)) key = camel(name.slice(1)).replace(/^./, function (c) { return c.toUpperCase(); });
        if (/^-ms-/.test(name)) key = 'ms' + key.slice(2);
        out[key] = val;
      }
    });
    return out;
  }

  // CSS das pseudo-classes (style-hover / style-focus)
  var pseudoCss = [], pseudoN = 0;
  function pseudoClass(decl, pseudo) {
    var cls = 'mx' + (++pseudoN);
    var body = decl.split(';').map(function (d) { d = d.trim(); return d ? d + ' !important' : ''; }).filter(Boolean).join(';');
    pseudoCss.push('.' + cls + ':' + pseudo + '{' + body + '}');
    return cls;
  }

  var RENAME = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', autocomplete: 'autoComplete', readonly: 'readOnly',
    maxlength: 'maxLength', colspan: 'colSpan', rowspan: 'rowSpan', srcset: 'srcSet', crossorigin: 'crossOrigin', enctype: 'encType',
    novalidate: 'noValidate', allowfullscreen: 'allowFullScreen', inputmode: 'inputMode', 'accept-charset': 'acceptCharset',
    referrerpolicy: 'referrerPolicy', frameborder: 'frameBorder', datetime: 'dateTime' };
  var BOOL = { disabled: 1, checked: 1, selected: 1, open: 1, required: 1, multiple: 1, hidden: 1, autofocus: 1, readonly: 1, novalidate: 1, allowfullscreen: 1 };
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };

  // ---------- compilação (DOM do <template> -> funções de desenho) ----------
  function compileChildren(parent, inSvg) {
    var list = [];
    parent.childNodes.forEach(function (n) { var c = compileNode(n, inSvg); if (c) list.push(c); });
    return list;
  }
  function renderChildren(list, scope) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i](scope);
      if (r == null || r === false) continue;
      if (Array.isArray(r)) out.push.apply(out, r); else out.push(r);
    }
    return out;
  }

  function compileNode(node, inSvg) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (!hasBind(t)) return function () { return t; };
      var m = WHOLE.exec(t);
      if (m) {
        var lead = t.match(/^\s*/)[0], trail = t.match(/\s*$/)[0], ex = m[1];
        return function (s) {
          var v = evalExpr(ex, s);
          if (v == null || v === false) v = '';
          if (typeof v === 'number') v = String(v);
          return [lead, v, trail].filter(function (x) { return x !== ''; });
        };
      }
      return function (s) { return interp(t, s); };
    }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;

    if (tag === 'sc-if') {
      var cond = WHOLE.exec(node.getAttribute('value') || '')[1];
      var kids = compileChildren(node, inSvg);
      return function (s) { return evalExpr(cond, s) ? renderChildren(kids, s) : null; };
    }
    if (tag === 'sc-for') {
      var listEx = WHOLE.exec(node.getAttribute('list'))[1], as = node.getAttribute('as') || 'item';
      var body = compileChildren(node, inSvg);
      return function (s) {
        var arr = evalExpr(listEx, s) || [];
        return arr.map(function (it, i) {
          var sc = Object.create(s); sc[as] = it; sc.$i = i;
          return h(R.Fragment, { key: i }, renderChildren(body, sc));
        });
      };
    }
    if (tag === 'sc-rep') { // lista repetível vinda da planilha (aba Listas)
      var k = node.getAttribute('k');
      var variants = [];
      node.childNodes.forEach(function (c) { if (c.nodeType === 1) variants.push(compileNode(c, inSvg)); });
      return function (s) {
        var arr = (s.$L && s.$L[k]) || [];
        return arr.map(function (it, i) {
          var sc = Object.create(s); sc.$it = it; sc.$i = i;
          return h(R.Fragment, { key: i }, variants[i % variants.length](sc));
        });
      };
    }
    if (tag === 'sc-slot') { // ponto onde o site.js injeta blocos prontos
      var name = node.getAttribute('name'), arg = node.getAttribute('arg');
      return function (s) { var f = s.$slot && s.$slot[name]; return f ? f(arg, s) : null; };
    }
    if (tag === 'image-slot') return compileImageSlot(node);

    var svg = inSvg || tag === 'svg';
    var rtag = tag === 'sc-raw-select' ? 'select' : tag;
    var staticProps = {}, dyn = [], classes = [];
    Array.prototype.forEach.call(node.attributes, function (a) {
      var n = a.name, v = a.value;
      if (n.indexOf('hint-') === 0) return;
      if (n === 'style-hover') { classes.push(pseudoClass(v, 'hover')); return; }
      if (n === 'style-focus') { classes.push(pseudoClass(v, 'focus')); return; }
      var key;
      if (n.indexOf('sc-camel-') === 0) key = camel(n.slice(9));
      else if (n === 'ref') key = 'ref';
      else if (RENAME[n]) key = RENAME[n];
      else if (n.indexOf('aria-') === 0 || n.indexOf('data-') === 0) key = n;
      else if (svg && n.indexOf('-') > 0) key = camel(n);
      else key = n;
      if (rtag === 'input' && n === 'checked') key = 'defaultChecked';
      if ((rtag === 'input' || rtag === 'textarea') && n === 'value' && (node.getAttribute('type') || '') !== 'radio' && (node.getAttribute('type') || '') !== 'checkbox') key = 'defaultValue';
      if (hasBind(v)) {
        var w = WHOLE.exec(v);
        dyn.push({ key: key, isStyle: n === 'style', whole: w ? w[1] : null, raw: v });
      } else if (n === 'style') staticProps.style = parseStyle(v);
      else if (BOOL[n]) staticProps[key] = true;
      else staticProps[key] = v;
    });
    if (classes.length) staticProps.className = ((staticProps.className || '') + ' ' + classes.join(' ')).trim();
    var kids = VOID[tag] ? [] : compileChildren(node, svg);
    if (rtag === 'textarea' && kids.length) { staticProps.defaultValue = node.textContent; kids = []; }
    return function (s) {
      var p = staticProps;
      if (dyn.length) {
        p = Object.assign({}, staticProps);
        for (var i = 0; i < dyn.length; i++) {
          var d = dyn[i], val = d.whole != null ? evalExpr(d.whole, s) : interp(d.raw, s);
          if (d.isStyle) val = parseStyle(String(val == null ? '' : val));
          if (val === undefined || val === null) continue;
          p[d.key] = val;
        }
      }
      return kids.length ? h.apply(null, [rtag, p].concat(renderChildren(kids, s))) : h(rtag, p);
    };
  }

  // <image-slot> -> foto recortada no formato do layout
  function compileImageSlot(node) {
    var get = function (n) { return node.getAttribute(n); };
    var shape = get('shape') || 'rounded', fit = get('fit') || 'cover';
    var radius = shape === 'circle' ? '50%' : shape === 'pill' ? '999px' : shape === 'rect' ? '0' : (get('radius') || '12') + 'px';
    var styleRaw = get('style') || '', srcRaw = get('src') || '', idRaw = get('id') || '', labelRaw = get('aria-label') || '';
    return function (s) {
      var id = interp(idRaw, s), label = interp(labelRaw, s);
      var src = (s.$foto && s.$foto(id)) || (hasBind(srcRaw) ? interp(srcRaw, s) : srcRaw);
      var st = Object.assign({ display: 'block', width: '100%', height: '100%', overflow: 'hidden', borderRadius: radius, position: 'relative' },
        parseStyle(hasBind(styleRaw) ? interp(styleRaw, s) : styleRaw));
      if (get('mask')) st.clipPath = get('mask');
      if (!src) { st.background = st.background || 'linear-gradient(135deg,#E8F2EA,#FFF1D6)'; return h('div', { style: st, role: 'img', 'aria-label': label, 'data-foto': id }); }
      return h('div', { style: st, 'data-foto': id },
        h('img', { src: src, alt: label, loading: 'lazy', decoding: 'async', style: { width: '100%', height: '100%', objectFit: fit, display: 'block' } }));
    };
  }

  window.Motor = {
    compile: function (templateEl) {
      var root = templateEl.content || templateEl;
      var list = compileChildren(root, false);
      var st = document.createElement('style'); st.textContent = pseudoCss.join('\n'); document.head.appendChild(st);
      return function (scope) { return h(R.Fragment, null, renderChildren(list, scope)); };
    },
    parseStyle: parseStyle
  };
})();
