import { LinkLegal, PaginaLegal } from './PaginaLegal'
import { CONTATO_EMAIL, RESPONSAVEL_NOME } from './responsavel'

/** Política de Privacidade (LGPD), página pública em `/privacidade`. Não é parecer jurídico. */
export function PrivacidadePage() {
  const email = <LinkLegal href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</LinkLegal>

  return (
    <PaginaLegal titulo="Política de Privacidade">
      <p>
        Esta política explica quais dados pessoais o Aprumo coleta, para que usa, com quem compartilha e quais são os
        seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <section aria-labelledby="quem-somos">
        <h2 id="quem-somos">1. Quem somos</h2>
        <p>
          O controlador dos seus dados é {RESPONSAVEL_NOME}, responsável pelo Aprumo. Ele também atua como encarregado
          pelo tratamento de dados pessoais. Para qualquer assunto sobre privacidade, escreva para {email}.
        </p>
      </section>

      <section aria-labelledby="dados-que-coletamos">
        <h2 id="dados-que-coletamos">2. Dados que coletamos</h2>
        <ul>
          <li>
            <strong>Dados da conta:</strong> nome, e-mail, senha (guardada apenas como hash BCrypt, nunca em texto
            aberto), identificador do Google quando você entra com o Google e a data de criação da conta.
          </li>
          <li>
            <strong>Conteúdo que você cria:</strong> categorias, cartões e itens, lançamentos (valores, status e
            vencimentos), tarefas, notas, projetos e subtarefas.
          </li>
          <li>
            <strong>Verificação por e-mail:</strong> ao se cadastrar ou redefinir a senha, guardamos temporariamente seu
            e-mail e nome junto com um código e um link de confirmação.
          </li>
          <li>
            <strong>Segurança e abuso:</strong> para limitar envios em excesso, o Aprumo guarda apenas um código
            calculado (HMAC) a partir do seu IP e do seu e-mail. O Aprumo não grava o IP em texto aberto.
          </li>
        </ul>
        <p>
          Os provedores que hospedam o Aprumo (Render e Vercel, seção 4) registram o IP e dados técnicos de acesso nos
          próprios logs, como parte da operação deles. Não coletamos dados de localização, contatos, câmera ou
          microfone.
        </p>
      </section>

      <section aria-labelledby="finalidade-e-base-legal">
        <h2 id="finalidade-e-base-legal">3. Para que usamos e base legal</h2>
        <ul>
          <li>
            <strong>Manter sua conta e o seu conteúdo</strong> (entrar, guardar e mostrar seus lançamentos, tarefas,
            notas e projetos): execução de contrato, art. 7, V, da LGPD.
          </li>
          <li>
            <strong>Segurança e prevenção de abuso</strong> (limite de envios e de tentativas de login): legítimo
            interesse, art. 7, IX, da LGPD.
          </li>
        </ul>
        <p>
          Não usamos seus dados para publicidade, perfilamento ou venda. Como não tratamos dados com base em
          consentimento, não há caixa de aceite para isso.
        </p>
      </section>

      <section aria-labelledby="compartilhamento">
        <h2 id="compartilhamento">4. Com quem compartilhamos</h2>
        <p>
          Usamos prestadores de serviço (operadores) que tratam dados em nosso nome, só para o funcionamento do
          Aprumo:
        </p>
        <ul>
          <li>
            <strong>Google:</strong> login com Google e envio dos e-mails de verificação pelo Gmail.
          </li>
          <li>
            <strong>Supabase:</strong> banco de dados, em servidores nos Estados Unidos (região us-east-1).
          </li>
          <li>
            <strong>Render:</strong> hospedagem da API, em servidores nos Estados Unidos (Virgínia).
          </li>
          <li>
            <strong>Vercel:</strong> hospedagem do site (São Paulo) e repasse das chamadas à API.
          </li>
        </ul>
        <p>
          Como alguns desses prestadores ficam fora do Brasil, seus dados são transferidos para outros países. Essa
          transferência internacional é feita com base no art. 33 da LGPD, e só para prestar o serviço que você usa.
          Não vendemos nem cedemos seus dados a terceiros para outros fins.
        </p>
      </section>

      <section aria-labelledby="cookies">
        <h2 id="cookies">5. Cookies e armazenamento local</h2>
        <ul>
          <li>
            <strong>Cookie de sessão (cc_session):</strong> mantém você logado. Expira em até 24 horas ou ao sair, e
            persiste se você fechar o navegador antes disso. Não é acessível por scripts (HttpOnly), só trafega por conexão segura (Secure) e só é enviado ao
            próprio Aprumo (SameSite=Strict).
          </li>
          <li>
            <strong>Armazenamento local do navegador (localStorage):</strong> guardamos o horário da sua última
            atividade, suas preferências visuais, o tema escolhido e as reflexões que você marcou como favoritas. Esses
            dados ficam no seu aparelho.
          </li>
        </ul>
        <p>Não usamos cookies de rastreamento, de análise de uso nem de publicidade.</p>
      </section>

      <section aria-labelledby="retencao">
        <h2 id="retencao">6. Por quanto tempo guardamos</h2>
        <ul>
          <li>
            <strong>Dados da conta e conteúdo:</strong> enquanto a conta estiver ativa. Você pode excluir a conta a
            qualquer momento (veja a seção 8). A exclusão é imediata e definitiva: apagamos a conta e todo o conteúdo
            dela, e não há como recuperar depois.
          </li>
          <li>
            <strong>Códigos e links de verificação (com seu e-mail e nome):</strong> expiram em 15 minutos, com no máximo
            5 tentativas. O registro vencido é apagado no uso seguinte do serviço de verificação, e não em um horário
            fixo.
          </li>
          <li>
            <strong>Código de limite de envios (HMAC do IP e do e-mail):</strong> vale por 24 horas e é apagado no
            primeiro pedido feito depois de 24 horas, e não em um horário fixo.
          </li>
          <li>
            <strong>Cópias de segurança e registros (logs) dos provedores, incluindo IP e dados técnicos de acesso nos
            próprios logs:</strong> ficam sob o prazo definido por cada provedor, que não é controlado pelo Aprumo.
          </li>
        </ul>
      </section>

      <section aria-labelledby="seguranca">
        <h2 id="seguranca">7. Segurança</h2>
        <p>
          Adotamos medidas técnicas para proteger seus dados: a senha é guardada só como hash, a sessão usa cookie
          protegido, as conexões são criptografadas e o Aprumo não grava o IP em texto aberto. Nenhum sistema é totalmente
          imune a falhas. Se houver um incidente de segurança que possa causar risco relevante a você, avisaremos você e
          a Autoridade Nacional de Proteção de Dados (ANPD), como a lei exige.
        </p>
      </section>

      <section aria-labelledby="direitos">
        <h2 id="direitos">8. Seus direitos</h2>
        <p>Conforme o art. 18 da LGPD, você pode pedir:</p>
        <ul>
          <li>confirmação de que tratamos seus dados;</li>
          <li>acesso aos seus dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados fora da lei;</li>
          <li>portabilidade dos seus dados;</li>
          <li>informação sobre com quem compartilhamos seus dados;</li>
          <li>revogação de consentimento, quando ele for a base do tratamento.</li>
        </ul>
        <p>
          <strong>Exclusão da conta:</strong> você mesmo faz isso no app, em Excluir conta (no menu lateral, perto de
          Alterar senha), confirmando com a sua senha ou, se a conta entra com o Google, com o Google. A exclusão é
          imediata e definitiva e apaga a conta e todos os dados dela. Se não conseguir entrar, escreva para {email}.
          Veja também <LinkLegal to="/excluir-conta">como excluir sua conta</LinkLegal>.
        </p>
        <p>
          Os demais pedidos são feitos por e-mail, em {email}, e não por botões no app. Respondemos em até 15 dias.
          Para sua segurança, podemos pedir que você confirme sua identidade antes de atender.
        </p>
        <p>
          Se achar que seus dados foram tratados de forma incorreta, você também pode reclamar à ANPD, em{' '}
          <LinkLegal href="https://www.gov.br/anpd">www.gov.br/anpd</LinkLegal>.
        </p>
      </section>

      <section aria-labelledby="criancas">
        <h2 id="criancas">9. Crianças e adolescentes</h2>
        <p>
          O Aprumo é para maiores de 18 anos e não é destinado a crianças ou adolescentes. Se soubermos que uma conta
          pertence a alguém menor de 18 anos, poderemos excluí-la.
        </p>
      </section>

      <section aria-labelledby="mudancas">
        <h2 id="mudancas">10. Mudanças nesta política</h2>
        <p>
          Podemos atualizar esta política. A data de vigência no topo da página mostra a versão em uso. Consulte
          esta página de tempos em tempos para ver a versão mais recente.
        </p>
      </section>
    </PaginaLegal>
  )
}
