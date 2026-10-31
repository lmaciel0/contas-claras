// Define o tema antes do primeiro paint para não piscar claro no escuro. Fica num arquivo externo porque a CSP
// (vercel.json) não libera script inline. Mantém a lógica de src/tema/tema.ts (chave, cores da barra e fallback).
;(function () {
  var tema = null
  try {
    var salvo = localStorage.getItem('aprumo-tema')
    if (salvo === 'claro' || salvo === 'escuro') tema = salvo
  } catch {}
  if (!tema) {
    tema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
  }
  document.documentElement.dataset.tema = tema
  var barra = document.querySelector('meta[name="theme-color"]')
  if (barra) barra.setAttribute('content', tema === 'escuro' ? '#0f0b2b' : '#27187E')
})()
