/* Carrega o conteúdo: planilha do Google (se configurada) > cópia salva > conteúdo padrão. */
(function () {
  'use strict';
  var PAD = window.CONTEUDO_PADRAO;
  var CFG = window.SITE_CONFIG || {};
  var h = React.createElement;

  // ---------- leitura da planilha ----------
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  // linhas -> objetos usando a 1ª linha como cabeçalho; mapa: {campo: ['nome da coluna', ...]}
  function toObjects(rows, map) {
    if (!rows || rows.length < 1) return [];
    var head = rows[0].map(norm), idx = {};
    Object.keys(map).forEach(function (k) {
      idx[k] = -1;
      map[k].forEach(function (name) { var j = head.indexOf(norm(name)); if (j >= 0 && idx[k] < 0) idx[k] = j; });
    });
    return rows.slice(1).map(function (r) {
      var o = {}; Object.keys(idx).forEach(function (k) { o[k] = idx[k] >= 0 ? String(r[idx[k]] == null ? '' : r[idx[k]]).trim() : ''; }); return o;
    });
  }
  function fetchTab(id, tab) {
    var url = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent(tab) + '&t=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(parseCSV);
  }

  var TABS = {
    geral: ['Geral', { campo: ['Código', 'Campo'], valor: ['Valor'] }],
    textos: ['Textos', { codigo: ['Código'], texto: ['Texto'] }],
    listas: ['Listas', { lista: ['Código da lista', 'Lista'], item: ['Item'] }],
    fotos: ['Fotos', { codigo: ['Código'], link: ['Link da nova foto', 'Link'] }],
    noticias: ['Notícias', { titulo: ['Título'], categoria: ['Categoria'], data: ['Data'], resumo: ['Resumo', 'Texto'], foto: ['Link da foto', 'Foto'], link: ['Link para saber mais', 'Link'] }],
    documentos: ['Documentos', { secao: ['Seção'], titulo: ['Título'], tipo: ['Tipo'], data: ['Data de atualização', 'Data'], periodo: ['Período', 'Edição / período'], situacao: ['Situação'], descricao: ['Observação', 'Descrição'], link: ['Link do arquivo', 'Link'] }],
    perguntas: ['Perguntas', { pergunta: ['Pergunta'], resposta: ['Resposta'] }],
    parceiros: ['Parceiros', { nome: ['Nome'], logo: ['Link do logo', 'Logo'], link: ['Site do parceiro', 'Link'] }],
    relatos: ['Relatos', { texto: ['Relato', 'Texto'], autor: ['Quem disse', 'Autor'] }],
    atividades: ['Atividades', { titulo: ['Atividade', 'Título'], foto: ['Link da foto', 'Foto'] }],
    extras: ['Seções extras', { pagina: ['Página'], titulo: ['Título'], texto: ['Texto'], foto: ['Link da foto', 'Foto'], botao: ['Texto do botão'], link: ['Link do botão'] }]
  };

  function fromSheet(id) {
    var keys = Object.keys(TABS);
    return Promise.all(keys.map(function (k) {
      return fetchTab(id, TABS[k][0]).then(function (rows) { return toObjects(rows, TABS[k][1]); }).catch(function (e) { console.warn('[site] aba não lida:', TABS[k][0], e); return null; });
    })).then(function (res) {
      var raw = {}; keys.forEach(function (k, i) { raw[k] = res[i]; });
      return raw;
    });
  }

  // ---------- montar o conteúdo final ----------
  var PAGE_IDS = { 'inicio': 'inicio', 'a creche': 'creche', 'nossa historia': 'historia', 'historia': 'historia', 'o que fazemos': 'oque', 'projetos': 'projetos',
    'conexao e movimento': 'conexao', 'noticias': 'noticias', 'documentos': 'documentos', 'transparencia': 'documentos', 'prestacao de contas': 'prestacao', 'relatorios': 'relatorios',
    'contato': 'contato', 'doe agora': 'doe', 'doe': 'doe', 'perguntas frequentes': 'faq', 'duvidas': 'faq', 'ouvidoria': 'ouvidoria' };

  function driveImg(url) {
    if (!url) return '';
    url = String(url).trim();
    var m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/) || url.match(/drive\.google\.com\/thumbnail\?id=([\w-]{20,})/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1600';
    return url;
  }
  function filled(arr, f) { return (arr || []).filter(function (o) { return o && String(o[f] || '').trim(); }); }

  function build(raw) {
    var C = { G: Object.assign({}, PAD.geral), raw: Object.assign({}, PAD.textos), listas: Object.assign({}, PAD.listas), fotos: {} };
    var usedSheet = !!raw;
    raw = raw || {};
    if (raw.geral) raw.geral.forEach(function (r) { if (r.campo && r.campo in C.G) C.G[r.campo] = r.valor; });
    // Textos: só aceita a aba se ela parecer completa (proteção contra leitura errada)
    if (raw.textos && filled(raw.textos, 'codigo').length > Object.keys(PAD.textos).length * 0.5) {
      raw.textos.forEach(function (r) { if (r.codigo in C.raw) C.raw[r.codigo] = r.texto; });
    }
    if (raw.listas && filled(raw.listas, 'lista').length) {
      var L = {}; Object.keys(PAD.listas).forEach(function (k) { L[k] = []; });
      raw.listas.forEach(function (r) { if (r.lista && r.item && r.lista in L) L[r.lista].push(r.item); });
      C.listas = L;
    }
    if (raw.fotos) raw.fotos.forEach(function (r) { if (r.codigo && r.link) C.fotos[r.codigo] = driveImg(r.link); });
    function pick(name) { return raw[name] ? raw[name] : PAD[name]; }

    var cores = { eventos: '#2E7D3A', pedagogico: '#2F6DB3', projetos: '#B4541A', reconhecimento: '#C63A2F' }, pal = ['#2E7D3A', '#2F6DB3', '#B4541A', '#C63A2F', '#235C96'];
    C.noticias = filled(pick('noticias'), 'titulo').map(function (n, i) {
      return { id: 'n' + i, t: n.titulo, cat: n.categoria, c: cores[norm(n.categoria)] || pal[i % pal.length], data: n.data, resumo: n.resumo, foto: driveImg(n.foto), link: n.link };
    });
    var docs = filled(pick('documentos'), 'titulo'), tipoCor = { pdf: '#1E5428', ppt: '#B85A0A', pptx: '#B85A0A', doc: '#235C96', docx: '#235C96', xls: '#2E7D3A', xlsx: '#2E7D3A' };
    var dpal = ['#1E5428', '#235C96', '#C63A2F', '#B85A0A'];
    function secao(d) { return norm(d.secao || 'Documentos'); }
    var grupos = {}, ordem = [];
    docs.filter(function (d) { return ['prestacao de contas', 'relatorios', 'relatorio'].indexOf(secao(d)) < 0; }).forEach(function (d, i) {
      var g = (d.secao || 'Documentos').trim();
      if (!grupos[g]) { grupos[g] = []; ordem.push(g); }
      var k = (d.tipo || 'PDF').toUpperCase();
      grupos[g].push({ t: d.titulo, k: k, c: tipoCor[k.toLowerCase()] || dpal[i % dpal.length], data: d.data, descricao: d.descricao, link: d.link });
    });
    C.docGroups = ordem.map(function (g) { return { titulo: ordem.length > 1 || g !== 'Documentos' ? g : '', itens: grupos[g] }; });
    var sit = function (s) { s = norm(s); return s.indexOf('dia') >= 0 || s.indexOf('aprov') >= 0 ? ['#E8F2EA', '#1E5428'] : s.indexOf('encerr') >= 0 || s.indexOf('conclu') >= 0 ? ['#E4E7E1', '#36403A'] : ['#FCEBD6', '#7A4A0A']; };
    C.prestacoes = docs.filter(function (d) { return secao(d) === 'prestacao de contas'; }).map(function (d) {
      var c = sit(d.situacao); return { titulo: d.titulo, periodo: d.periodo || d.data, situacao: d.situacao, sitBg: c[0], sitFg: c[1], link: d.link };
    });
    C.relatorios = docs.filter(function (d) { return secao(d) === 'relatorios' || secao(d) === 'relatorio'; }).map(function (d) {
      var sub = [d.periodo, d.data ? 'Atualizado em ' + d.data : ''].filter(Boolean).join(' · ');
      return { titulo: d.titulo, tipo: (d.tipo || 'PDF').toUpperCase(), sub: sub, link: d.link };
    });
    C.perguntas = filled(pick('perguntas'), 'pergunta').map(function (p) { return { q: p.pergunta, a: p.resposta }; });
    var RB = [['#1E5428', '#F29A2E', '#CFE6D3', '-2.5deg', '6s', '0.6s'], ['#C63A2F', '#FFD28A', '#FFE3DF', '1.8deg', '7s', '1.2s'], ['#235C96', '#F29A2E', '#D6E6F7', '-1.5deg', '5s', '1.8s'], ['#B85A0A', '#FFF1D6', '#FFF1D6', '2.2deg', '6s', '2.4s']];
    C.relatosBase = filled(pick('relatos'), 'texto').map(function (r, i) {
      var v = RB[i % 4]; return { texto: r.texto, autor: r.autor, bg: v[0], aspas: v[1], legenda: v[2], rot: v[3], anim: 'diaBob ' + v[4] + ' ease-in-out ' + v[5] + ' infinite', delay: (i * 0.15).toFixed(2) + 's', n: i % 4 };
    });
    var PR = [['-2deg', '5s', '0.0s'], ['1.5deg', '6s', '0.5s'], ['-1.5deg', '7s', '1.0s'], ['2deg', '5s', '1.5s'], ['-1deg', '6s', '2.0s'], ['1.8deg', '7s', '2.5s']];
    C.parceiros = filled(pick('parceiros'), 'nome').map(function (p, i) {
      var v = PR[i % 6]; return { nome: p.nome, logo: driveImg(p.logo), link: p.link, rot: v[0], anim: 'diaBob ' + v[1] + ' ease-in-out ' + v[2] + ' infinite', delay: (i * 0.12).toFixed(2) + 's' };
    });
    var AC = ['#E58A1F', '#C63A2F', '#2F6DB3', '#2E7D3A'];
    C.atividades = filled(pick('atividades'), 'titulo').map(function (a, i) { return { id: 'a' + i, t: a.titulo, foto: driveImg(a.foto), c: AC[i % 4] }; });
    C.extras = filled(pick('extras'), 'titulo').map(function (e) {
      return { pagina: PAGE_IDS[norm(e.pagina)] || norm(e.pagina), titulo: e.titulo, texto: e.texto, foto: driveImg(e.foto), botao: e.botao, link: e.link };
    });
    // Geral derivado
    var G = C.G;
    G.mapaQ = encodeURIComponent(G.enderecoMapa || '').replace(/%20/g, '+');
    G.whatsapp = String(G.whatsapp || '').replace(/\D/g, '');
    G.emailFormularios = G.emailFormularios || G.email;
    G.urlObrigado = location.href.split('#')[0] + '#obrigado';
    C.pixCopia = /^[\d.\-\/\s()]+$/.test(G.pix || '') ? String(G.pix).replace(/\D/g, '') : G.pix;
    C.foto = function (id) { return C.fotos[id] || ''; };
    C.T = {};
    Object.keys(C.raw).forEach(function (k) { C.T[k] = fmt(C.raw[k]); });
    C.fonte = usedSheet ? 'planilha' : 'padrão';
    return C;
  }

  // **negrito** e quebras de linha
  function fmt(s) {
    s = s == null ? '' : String(s);
    if (s.indexOf('**') < 0 && s.indexOf('\n') < 0) return s;
    var out = [], parts = s.split('**');
    parts.forEach(function (p, i) {
      var lines = p.split('\n'), seg = [];
      lines.forEach(function (ln, j) { if (j) seg.push(h('br', { key: 'b' + i + '_' + j })); if (ln) seg.push(ln); });
      if (i % 2) out.push(h('strong', { key: 's' + i }, seg)); else out.push.apply(out, seg);
    });
    return out;
  }

  // ---------- carregar ----------
  window.carregarConteudo = function (cb) {
    var KEY = 'site-conteudo-v1', done = false;
    function finish(raw, fromCache) {
      var C = build(raw);
      cb(C, fromCache);
    }
    if (!CFG.planilhaId) { finish(null); return; }
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (cached) { done = true; finish(cached, true); }
    var timer = setTimeout(function () { if (!done) { done = true; finish(null); } }, 6000);
    fromSheet(CFG.planilhaId).then(function (raw) {
      clearTimeout(timer);
      var ok = Object.keys(raw).some(function (k) { return raw[k] && raw[k].length; });
      if (!ok) { if (!done) { done = true; finish(null); } return; }
      try { localStorage.setItem(KEY, JSON.stringify(raw)); } catch (e) {}
      var changed = JSON.stringify(raw) !== JSON.stringify(cached);
      if (!done) { done = true; finish(raw); }
      else if (changed) finish(raw);   // atualiza a tela com a versão nova
    });
  };
  window.__fmt = fmt;
})();
