/* Lógica do site (navegação, animações, acessibilidade). Gerado a partir do protótipo do Claude Design. */
window.TITULOS = { creche: 'A Creche', historia: 'Nossa história', oque: 'O que fazemos', projetos: 'Projetos', conexao: 'Conexão e Movimento', noticias: 'Notícias',
  documentos: 'Documentos', prestacao: 'Prestação de contas', relatorios: 'Relatórios', contato: 'Contato', doe: 'Doe agora', faq: 'Perguntas frequentes', ouvidoria: 'Ouvidoria' };
let C = null;

class Site extends React.Component {
  state = { page: null, vw: typeof window !== 'undefined' ? window.innerWidth : 1280, sy: 0, menuOpen: false, tOpen: false, slide: 0, hl: 0, paused: false, resp: 0, cnt: 0, heroIn: false };
  PAGES = ['inicio','creche','historia','oque','projetos','conexao','noticias','documentos','prestacao','relatorios','contato','doe','faq','ouvidoria'];
  get NEWS() { return C.noticias; }

  componentDidMount() {
    this.onPop = () => this.go(location.hash.slice(1) || 'inicio', true);
    window.addEventListener('popstate', this.onPop);
    const h0 = location.hash.slice(1);
    if (h0 === 'obrigado') { this.setState({ obrigado: true }); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
    else if (h0 && this.PAGES.indexOf(h0) >= 0) this.go(h0, true);
    this.onResize = () => this.setState({ vw: window.innerWidth });
    this.onScroll = () => { const sy = window.scrollY; if ((sy > 100) !== (this.state.sy > 100)) this.setState({ sy }); else this.state.sy = sy; };
    window.addEventListener('resize', this.onResize);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.t1 = setInterval(() => this.setState(s => ({ slide: (s.slide + 1) % 3 })), 6000);
    this.t2 = setInterval(() => { if (!this.state.paused) this.step(1); }, 5000);
    this.t3 = setInterval(() => this.setState(s => ({ resp: (s.resp + 1) % 3 })), 5000);
    this.t4 = setTimeout(() => this.setState({ heroIn: true }), 80);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    clearInterval(this.t1); clearInterval(this.t2); clearInterval(this.t3); clearTimeout(this.t4);
    if (this.io) this.io.disconnect();
    cancelAnimationFrame(this.raf);
  }
  get HIST() { return [1,2,3,4,5].map(i => C.raw['historia_aba' + i]); }
  HCOL = ['#2E7D3A','#F29A2E','#C63A2F','#3B8FD9','#1E5428'];
  histVals() {
    const st = this.state.hStep || 0, n = this.HIST.length;
    const set = (i) => this.setState({ hStep: Math.max(0, Math.min(n - 1, i)) });
    const hIs = {}; this.HIST.forEach((_, i) => hIs['s' + i] = st === i);
    return {
      hIs,
      hTabs: this.HIST.map((label, i) => ({ label, go: () => set(i), sel: st === i, size: st === i ? '26px' : '18px', c: this.HCOL[i], bg: i <= st ? this.HCOL[i] : '#fff', fg: st === i ? '#1E5428' : '#4F5A53' })),
      hProgress: (st / (n - 1) * 80) + '%',
      hPrev: () => set(st - 1), hFirst: st === 0, hPrevOp: st === 0 ? 0.4 : 1,
      hNext: () => st === n - 1 ? set(0) : set(st + 1), hNextLabel: st === n - 1 ? C.T.historia_voltar : C.T.historia_proximo
    };
  }
  perView() { const w = this.state.vw; return w < 700 ? 1 : w < 1024 ? 2 : 3; }
  step(d) {
    const max = this.NEWS.length - this.perView();
    this.setState(s => { let n = s.hl + d; if (n > max) n = 0; if (n < 0) n = max; return { hl: n }; });
  }
  go(p, fromHistory) {
    if (this.PAGES.indexOf(p) < 0) p = 'inicio';
    if (!fromHistory && location.hash.slice(1) !== p) { try { history.pushState(null, '', '#' + p); } catch (e) {} }
    document.title = (p === 'inicio' ? '' : (window.TITULOS[p] || '') + ' — ') + 'Creche Lar de Jesus — Nova Era/MG';
    this.setState({ page: p, menuOpen: false, tOpen: false, cnt: 0, hl: 0 });
    window.scrollTo(0, 0);
    const m = document.getElementById('content'); if (m) m.focus({ preventScroll: true });
  }
  rvObs = {};
  rv = (name) => this.rvObs['f_' + name] || (this.rvObs['f_' + name] = (el) => {
    const o = this.rvObs[name]; if (o) { o.disconnect(); this.rvObs[name] = null; }
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { this.setState({ ['seen_' + name]: true }); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el); this.rvObs[name] = io;
  });
  fasesRef = (el) => {
    if (this.fio) { this.fio.disconnect(); this.fio = null; }
    if (!el) return;
    this.fio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { this.setState({ fases: true }); this.fio.disconnect(); } }, { threshold: 0.25 });
    this.fio.observe(el);
  };
  counterRef = (el) => {
    if (this.io) { this.io.disconnect(); this.io = null; }
    if (!el) return;
    this.io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting && this.state.cnt === 0) {
        const t0 = performance.now();
        const tick = (t) => { const p = Math.min(1, (t - t0) / 1600); this.setState({ cnt: 1 - Math.pow(1 - p, 3) }); if (p < 1) this.raf = requestAnimationFrame(tick); };
        this.raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    this.io.observe(el);
  };
  renderVals() {
    const P = this.props, s = this.state;
    const page = s.page || P.initialPage || 'inicio';
    const is = {}; this.PAGES.forEach(k => is[k] = page === k);
    const nav = {}; this.PAGES.forEach(k => nav[k] = (e) => { if (e) e.preventDefault(); this.go(k); });
    const activeKey = page === 'conexao' ? 'projetos' : (page === 'prestacao' || page === 'relatorios') ? 'documentos' : page;
    const ul = {}, cur = {};
    this.PAGES.forEach(k => { ul[k] = activeKey === k ? 'calc(100% - 18px) 2px' : '0% 2px'; cur[k] = activeKey === k ? 'page' : undefined; });
    const labels = ['inicio','creche','historia','oque','projetos'].map(k => [k, C.raw['geral_menu_' + k]]);
    const navA = labels.map(([k, label]) => ({ k, label, go: nav[k], ul: ul[k], cur: cur[k] }));
    const mobile = s.vw < 1320, pv = this.perView(), e = s.cnt;
    const inV = s.heroIn ? 1 : 0, inY = s.heroIn ? '0' : '16px';
    const narrow = s.vw < 760;
    const heroOverlay = s.vw < 900 ? 'linear-gradient(180deg, rgba(255,255,255,.88) 0%, rgba(255,255,255,.8) 60%, rgba(255,255,255,.55) 100%)' : 'linear-gradient(90deg, rgba(255,255,255,.95) 0%, rgba(255,255,255,.86) 32%, rgba(255,255,255,.35) 58%, rgba(255,255,255,0) 78%)';
    return {
      is, nav, ul, cur, navA, heroOverlay,
      pixLabel: s.pixCopied ? C.T.doe_pix_copiado : C.T.doe_pix_copiar,
      copyPix: () => { try { navigator.clipboard.writeText(C.pixCopia); } catch (e) {} this.setState({ pixCopied: true }); clearTimeout(this.pixT); this.pixT = setTimeout(() => this.setState({ pixCopied: false }), 2500); },
      isDesktopNav: !mobile, isMobileNav: mobile, menuOpen: s.menuOpen, mobileMenuOpen: mobile && s.menuOpen,
      toggleMenu: () => this.setState(x => ({ menuOpen: !x.menuOpen })),
      tOpen: s.tOpen, openT: () => this.setState({ tOpen: true }), closeT: () => this.setState({ tOpen: false }), toggleT: () => this.setState(x => ({ tOpen: !x.tOpen })),
      transpUl: ['documentos','prestacao','relatorios'].includes(page) ? 'calc(100% - 30px) 2px' : '0% 2px',
      heroCollage: (P.heroStyle ?? 'collage') === 'collage', heroTextOrder: s.vw < 920 ? 2 : 1, heroLogoOrder: s.vw < 920 ? 1 : 2, heroFull: P.heroStyle === 'full', heroSplit: P.heroStyle === 'split',
      ...this.histVals(),
      hOp0: s.slide === 0 ? 1 : 0, hOp1: s.slide === 1 ? 1 : 0, hOp2: s.slide === 2 ? 1 : 0,
      rOp0: s.resp === 0 ? 1 : 0, hPe0: s.slide === 0 ? 'auto' : 'none', hPe1: s.slide === 1 ? 'auto' : 'none', hPe2: s.slide === 2 ? 'auto' : 'none', rPe0: s.resp === 0 ? 'auto' : 'none', rPe1: s.resp === 1 ? 'auto' : 'none', rPe2: s.resp === 2 ? 'auto' : 'none', rOp1: s.resp === 1 ? 1 : 0, rOp2: s.resp === 2 ? 1 : 0,
      in1: inV, in2: inV, in3: inV, in4: inV, inY1: inY, inY2: inY, inY3: inY, inY4: inY,
      faq: C.perguntas,
      a11yOpen: !!s.a11yOpen, toggleA11y: () => this.setState(x => ({ a11yOpen: !x.a11yOpen })),
      a11yBigger: () => this.setState(x => ({ a11yZoom: Math.min(1.4, +((x.a11yZoom || 1) + 0.1).toFixed(1)) })),
      a11ySmaller: () => this.setState(x => ({ a11yZoom: Math.max(0.9, +((x.a11yZoom || 1) - 0.1).toFixed(1)) })),
      a11yZoomLbl: Math.round((s.a11yZoom || 1) * 100) + '%',
      a11yContrast: () => this.setState(x => ({ a11y_contrast: !x.a11y_contrast })), a11yContrastOn: !!s.a11y_contrast, a11yContrastBg: s.a11y_contrast ? '#1E5428' : '#fff', a11yContrastFg: s.a11y_contrast ? '#fff' : '#1E5428',
      a11yLinks: () => this.setState(x => ({ a11y_links: !x.a11y_links })), a11yLinksOn: !!s.a11y_links, a11yLinksBg: s.a11y_links ? '#1E5428' : '#fff', a11yLinksFg: s.a11y_links ? '#fff' : '#1E5428',
      a11yMotion: () => this.setState(x => ({ a11y_motion: !x.a11y_motion })), a11yMotionOn: !!s.a11y_motion, a11yMotionBg: s.a11y_motion ? '#1E5428' : '#fff', a11yMotionFg: s.a11y_motion ? '#fff' : '#1E5428',
      a11yReset: () => this.setState({ a11yZoom: 1, a11y_contrast: false, a11y_links: false, a11y_motion: false }), news: C.noticias, activities: C.atividades, docGroups: C.docGroups, prestacoes: C.prestacoes, relatorios: C.relatorios, parceiros: C.parceiros,
      relatos: C.relatosBase.map(x => Object.assign({}, x, { tr: [this.state.seen_rel ? 'none' : 'translateY(70px) rotate(-6deg)', this.state.seen_rel ? 'none' : 'translateY(90px) rotate(5deg)', this.state.seen_rel ? 'none' : 'translateY(70px) rotate(-5deg)', this.state.seen_rel ? 'none' : 'translateY(90px) rotate(6deg)'][x.n] })),
      transpTabs: ['documentos','prestacao','relatorios'].map(k => ({ k, label: C.raw['geral_transp_' + k], go: nav[k], cur: page === k ? 'page' : undefined, bg: page === k ? '#1E5428' : '#fff', fg: page === k ? '#fff' : '#1E5428' })),
      $T: C.T, $L: C.listas, G: C.G, $foto: C.foto, $slot: { extras: (pg) => window.renderExtras(C, pg, nav) },
      hlBasis: (100 / pv) + '%', hlTransform: `translateX(-${s.hl * 100 / pv}%)`,
      hlPrev: () => this.step(-1), hlNext: () => this.step(1),
      hlPause: () => this.setState({ paused: true }), hlResume: () => this.setState({ paused: false }),
      counterRef: this.counterRef, fasesRef: this.fasesRef,
      rvRel: this.rv('rel'), rvOq: this.rv('oq'), oqOp: this.state.seen_oq ? 1 : 0, oqT: this.state.seen_oq ? 'none' : 'translateY(50px) scale(.92)', rvOrg: this.rv('org'), orgOp: this.state.seen_org ? 1 : 0, orgT: this.state.seen_org ? 'none' : 'translateY(40px)', rvParc: this.rv('parc'), parcOp: this.state.seen_parc ? 1 : 0, parcT: this.state.seen_parc ? 'none' : 'translateY(60px) scale(.8)', rvMv: this.rv('mv'), rvVal: this.rv('val'),
      relOp: this.state.seen_rel ? 1 : 0,
      relT1: this.state.seen_rel ? 'none' : 'translateY(70px) rotate(-6deg)', relT2: this.state.seen_rel ? 'none' : 'translateY(90px) rotate(5deg)',
      relT3: this.state.seen_rel ? 'none' : 'translateY(70px) rotate(-5deg)', relT4: this.state.seen_rel ? 'none' : 'translateY(90px) rotate(6deg)',
      mvOp: this.state.seen_mv ? 1 : 0,
      mvT1: this.state.seen_mv ? 'none' : 'translateX(-120px) rotate(-6deg)', mvT2: this.state.seen_mv ? 'none' : 'translateY(100px) rotate(4deg)', mvT3: this.state.seen_mv ? 'none' : 'translateX(120px) rotate(6deg)',
      mkW: this.state.seen_mv ? '100%' : '0%',
      valOp: this.state.seen_mv ? 1 : 0, valT: this.state.seen_mv ? 'none' : 'translateX(30px) scale(.8)',
      fOp: this.state.fases ? 1 : 0,
      fT1: this.state.fases ? 'none' : 'translateY(60px) rotate(-3deg) scale(.94)',
      fT2: this.state.fases ? 'none' : 'translateY(80px) rotate(2deg) scale(.94)',
      fT3: this.state.fases ? 'none' : 'translateY(60px) rotate(-2deg) scale(.94)', counterCols: narrow ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))',
      c1: Math.round((+C.G.numCriancas || 0) * e), c2: Math.round(100 * e) + '%', c3: Math.round((+C.G.numRefeicoes || 0) * e), c4: Math.round((+C.G.numAnos || 0) * e),
      
      showIg: !!C.G.instagram, showYt: !!C.G.youtube, showTt: !!C.G.tiktok,
      igUrl: C.G.instagram || '#', ytUrl: C.G.youtube || '#', ttUrl: C.G.tiktok || '#',
      wideTable: !narrow, rowCols: narrow ? 'minmax(0,1fr)' : '2fr 1fr 1fr 1fr',
      footJustify: narrow ? 'center' : 'space-between', footAlign: narrow ? 'center' : 'left', footItems: narrow ? 'center' : 'flex-start',
      noSubmit: (ev) => ev.preventDefault(),
      showTop: s.sy > 100, toTop: () => window.scrollTo({ top: 0, behavior: 'smooth' })
    };
  }
  componentDidUpdate() { this.applyA11y(); }
  applyA11y() {
    const d = document.documentElement, s = this.state;
    d.style.zoom = String(s.a11yZoom || 1);
    ['contrast','links','motion'].forEach(k => { if (s['a11y_' + k]) d.setAttribute('data-a11y-' + k, ''); else d.removeAttribute('data-a11y-' + k); });
  }
  render() {
    const v = this.renderVals();
    return React.createElement(React.Fragment, null, window.__tpl(v),
      this.state.obrigado ? window.renderObrigado(() => this.setState({ obrigado: false })) : null);
  }
}

/* ---------- Seções extras (aba "Seções extras" da planilha) ---------- */
window.renderExtras = function (C, pg, nav) {
  const h = React.createElement;
  const list = C.extras.filter(e => e.pagina === pg);
  if (!list.length) return null;
  const btn = (e) => {
    if (!e.botao || !e.link) return null;
    const interno = e.link.charAt(0) === '#' && nav[e.link.slice(1)];
    const st = { alignSelf: 'flex-start', background: '#C63A2F', color: '#fff', textDecoration: 'none', fontWeight: 800, padding: '13px 26px', borderRadius: '999px' };
    return interno ? h('a', { href: e.link, onClick: nav[e.link.slice(1)], style: st, className: 'extra-btn' }, e.botao)
      : h('a', { href: e.link, target: '_blank', rel: 'noopener', style: st, className: 'extra-btn' }, e.botao);
  };
  return list.map((e, i) => h('section', { key: 'x' + i, 'aria-label': e.titulo, style: { padding: 'clamp(48px,7vw,88px) 0', background: i % 2 ? '#FFF8EC' : '#E8F2EA' } },
    h('div', { style: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'grid', gap: 'clamp(24px,4vw,56px)', alignItems: 'center',
      gridTemplateColumns: e.foto ? 'repeat(auto-fit,minmax(min(100%,340px),1fr))' : '1fr' } },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: e.foto ? 'none' : '760px' } },
        h('h2', { style: { fontSize: 'clamp(28px,3.6vw,44px)', fontWeight: 900, lineHeight: 1.2, color: '#1E5428' } }, e.titulo),
        e.texto ? h('p', { style: { fontSize: '18px', color: '#36403A' } }, window.__fmt(e.texto)) : null,
        btn(e)),
      e.foto ? h('div', { style: { aspectRatio: '4/3', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 18px 44px rgba(30,84,40,.14)' } },
        h('img', { src: e.foto, alt: e.titulo, loading: 'lazy', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })) : null)));
};

/* ---------- aviso após envio de formulário ---------- */
window.renderObrigado = function (fechar) {
  const h = React.createElement;
  return h('div', { role: 'dialog', 'aria-label': 'Mensagem enviada', onClick: fechar,
    style: { position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(20,40,25,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' } },
    h('div', { onClick: (ev) => ev.stopPropagation(), style: { background: '#fff', borderRadius: '24px', padding: '32px', maxWidth: '420px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' } },
      h('h2', { style: { color: '#1E5428', fontSize: '28px', fontWeight: 900 } }, 'Mensagem enviada!'),
      h('p', { style: { color: '#36403A' } }, 'Obrigado pelo contato. A equipe da creche vai ler com atenção.'),
      h('button', { type: 'button', onClick: fechar, style: { alignSelf: 'center', border: 0, background: '#C63A2F', color: '#fff', fontWeight: 800, padding: '12px 26px', borderRadius: '999px', cursor: 'pointer' } }, 'Fechar')));
};

/* ---------- inicialização ---------- */
(function () {
  window.__tpl = window.Motor.compile(document.getElementById('modelo'));
  const root = ReactDOM.createRoot(document.getElementById('root'));
  window.carregarConteudo(function (conteudo) {
    C = conteudo;
    root.render(React.createElement(Site, { versao: Date.now() }));
  });
})();
