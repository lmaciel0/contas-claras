import { LinkLegal, PaginaLegal } from './PaginaLegal'
import { CONTATO_EMAIL } from './responsavel'

/** Termos de Uso, página pública em `/termos`. Não é parecer jurídico. */
export function TermosPage() {
  const email = <LinkLegal href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</LinkLegal>

  return (
    <PaginaLegal titulo="Termos de Uso">
      <p>
        Estes termos explicam as regras para usar o Aprumo. Ao criar uma conta ou usar o app, você concorda com eles.
        Se não concordar, não use o serviço.
      </p>

      <section aria-labelledby="o-servico">
        <h2 id="o-servico">1. O serviço</h2>
        <p>
          O Aprumo é um aplicativo pessoal para organizar suas finanças e anotações. O uso é gratuito. Não
          garantimos que o serviço ficará sempre disponível: ele pode ficar fora do ar por manutenção, falhas ou
          problemas dos nossos provedores, e pode mudar ou ser encerrado.
        </p>
      </section>

      <section aria-labelledby="quem-pode-usar">
        <h2 id="quem-pode-usar">2. Quem pode usar</h2>
        <p>
          O Aprumo é para maiores de 18 anos. O cadastro não confere a idade, então ao criar a conta você declara ter
          18 anos ou mais. Se soubermos que uma conta pertence a alguém menor de 18 anos, poderemos excluí-la.
        </p>
      </section>

      <section aria-labelledby="conta-e-senha">
        <h2 id="conta-e-senha">3. Sua conta e senha</h2>
        <p>
          Você é responsável por manter sua senha em segredo e por tudo o que acontece na sua conta. Use dados
          verdadeiros no cadastro. Se perceber um acesso que não foi seu, troque a senha e avise pelo e-mail de
          contato.
        </p>
      </section>

      <section aria-labelledby="seu-conteudo">
        <h2 id="seu-conteudo">4. Seu conteúdo</h2>
        <p>
          Os dados que você registra no Aprumo (lançamentos, tarefas, notas, projetos e o restante) continuam sendo
          seus. Você responde pelo que registra e não deve guardar conteúdo ilegal ou que viole direitos de outras
          pessoas. Usamos esse conteúdo só para fazer o serviço funcionar, como explica a{' '}
          <LinkLegal to="/privacidade">Política de Privacidade</LinkLegal>
          .
        </p>
      </section>

      <section aria-labelledby="nao-permitido">
        <h2 id="nao-permitido">5. O que não é permitido</h2>
        <ul>
          <li>usar o Aprumo para praticar crimes ou prejudicar outras pessoas;</li>
          <li>
            tentar acessar contas ou dados de outras pessoas, ou burlar as proteções de segurança do serviço;
          </li>
          <li>
            usar robôs, scripts ou qualquer automação para acessar o serviço, criar contas em massa ou enviar
            e-mails de verificação em excesso;
          </li>
          <li>sobrecarregar, copiar em massa ou tentar derrubar o serviço.</li>
        </ul>
      </section>

      <section aria-labelledby="sem-aconselhamento">
        <h2 id="sem-aconselhamento">6. Não é aconselhamento financeiro</h2>
        <p>
          O Aprumo é uma ferramenta de organização. Os números e textos do app não são recomendação de investimento,
          consultoria financeira, contábil ou jurídica. As decisões sobre o seu dinheiro são suas.
        </p>
      </section>

      <section aria-labelledby="suspensao-e-exclusao">
        <h2 id="suspensao-e-exclusao">7. Suspensão e exclusão de conta</h2>
        <p>
          Podemos suspender ou excluir uma conta que descumpra estes termos, que apresente abuso ou que ofereça risco
          ao serviço ou a outras pessoas. Você pode pedir a exclusão da sua conta a qualquer momento, por e-mail, em{' '}
          {email}. Hoje não há um botão no app para isso.
        </p>
      </section>

      <section aria-labelledby="limitacao">
        <h2 id="limitacao">8. Limitação de responsabilidade</h2>
        <p>
          O Aprumo é oferecido como está, sem garantias de funcionamento contínuo ou livre de erros. Na extensão
          permitida pela lei, não nos responsabilizamos por perdas decorrentes de indisponibilidade, falhas, perda de
          dados ou decisões tomadas com base nas informações do app. Faça por conta própria cópia de qualquer
          informação importante. Isso não afasta direitos que a lei garante a você e que não podem ser limitados.
        </p>
      </section>

      <section aria-labelledby="mudancas">
        <h2 id="mudancas">9. Mudanças</h2>
        <p>
          Podemos atualizar estes termos. A data de vigência no topo da página mostra a versão em uso. Se você
          continuar usando o Aprumo depois de uma mudança, entendemos que concorda com a nova versão.
        </p>
      </section>

      <section aria-labelledby="lei-e-contato">
        <h2 id="lei-e-contato">10. Lei aplicável e contato</h2>
        <p>
          Estes termos seguem a legislação brasileira. Para dúvidas, pedidos ou qualquer assunto sobre estes termos,
          escreva para {email}.
        </p>
      </section>
    </PaginaLegal>
  )
}
