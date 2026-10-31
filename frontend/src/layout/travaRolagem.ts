let travas = 0
let overflowOriginal = ''

/**
 * Trava a rolagem do `<body>` (menu e paleta abertos). As travas são contadas: o `overflow` original só volta quando a
 * última é solta, em qualquer ordem. Devolve a função que solta; chamá-la de novo não tem efeito.
 */
export function travarRolagem(): () => void {
  if (travas === 0) {
    overflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  travas += 1
  let solta = false
  return () => {
    if (solta) {
      return
    }
    solta = true
    travas -= 1
    if (travas === 0) {
      document.body.style.overflow = overflowOriginal
    }
  }
}
