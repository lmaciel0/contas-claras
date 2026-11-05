import { LinkLegal, PaginaLegal } from './PaginaLegal'
import { CONTATO_EMAIL } from './responsavel'

/**
 * Página pública em `/excluir-conta`, sem login: é o endereço informado à Google Play sobre como pedir a exclusão da
 * conta e dos dados. Explica o caminho dentro do app e o pedido por e-mail para quem não consegue entrar.
 */
export function ExclusaoDeContaPage() {
  const email = <LinkLegal href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</LinkLegal>

  return (
    <PaginaLegal titulo="Excluir sua conta do Aprumo">
      <p>
        Você pode apagar a sua conta do Aprumo, e todos os dados dela, quando quiser. A exclusão é imediata e
        definitiva.
      </p>

      <section aria-labelledby="pelo-app">
        <h2 id="pelo-app">Como excluir pelo app</h2>
        <ol
          aria-label="Passos para excluir a conta"
          className="m-0 flex list-decimal flex-col gap-1 pl-6"
        >
          <li>Abra o app do Aprumo e entre na sua conta.</li>
          <li>
            Abra o menu lateral (no celular, toque no botão de menu, o de três riscos, na barra do topo; os ícones da
            barra de baixo não levam a ele) e, no fim dele, perto de Alterar senha e de Preferências, toque em Excluir
            conta.
          </li>
          <li>Marque &quot;Entendo que é definitivo&quot;.</li>
          <li>
            Confirme que é você: digite a sua senha ou, se a conta entra com o Google, toque no botão do Google.
          </li>
          <li>Toque em Excluir minha conta.</li>
        </ol>
      </section>

      <section aria-labelledby="o-que-e-apagado">
        <h2 id="o-que-e-apagado">O que é apagado</h2>
        <p>Tudo o que está ligado à sua conta, na hora:</p>
        <ul>
          <li>os dados da conta (nome, e-mail, senha e vínculo com o Google);</li>
          <li>tarefas, notas, projetos e subtarefas;</li>
          <li>lançamentos, cartões, itens e categorias.</li>
        </ul>
        <p>
          Não há como desfazer nem recuperar depois. Cópias de segurança e registros dos provedores que hospedam o
          Aprumo seguem o prazo de cada provedor, que não é controlado pelo Aprumo (veja a{' '}
          <LinkLegal to="/privacidade">Política de Privacidade</LinkLegal>).
        </p>
      </section>

      <section aria-labelledby="sem-acesso">
        <h2 id="sem-acesso">Sem acesso ao app?</h2>
        <p>
          Se você não consegue entrar, escreva para {email} usando o e-mail da conta. Para a sua segurança, podemos
          pedir que você confirme sua identidade antes de excluir.
        </p>
      </section>
    </PaginaLegal>
  )
}
