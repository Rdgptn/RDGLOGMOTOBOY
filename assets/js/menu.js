(function () {
  var sidebar = document.querySelector('.os-sidebar');
  var toggle = document.getElementById('site-menu-toggle');
  var panel = document.getElementById('site-menu-panel');
  if (!sidebar || !toggle || !panel) return;
  function setOpen(open) {
    sidebar.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    panel.setAttribute('aria-hidden', String(!open));
  }
  toggle.addEventListener('click', function () { setOpen(!sidebar.classList.contains('menu-open')); });
  panel.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { setOpen(false); }); });
  document.addEventListener('click', function (event) { if (!sidebar.contains(event.target)) setOpen(false); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') { setOpen(false); toggle.focus(); } });
})();
