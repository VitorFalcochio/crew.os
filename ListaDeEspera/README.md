# Lista de espera CrewOS

Landing page estática em HTML, CSS e JavaScript. Abra `index.html` diretamente ou publique esta pasta em qualquer hospedagem estática.

## Layouts e assets

- Desktop e notebook recebem a apresentação completa do produto.
- Em telas de até 760 px, o cadastro aparece primeiro e a navegação é reduzida à equipe digital.
- Logo, humanoide e retratos estão em `assets/`. A página usa cópias WebP otimizadas e mantém os PNGs originais na mesma pasta.

## Formulário

O formulário já aponta para `/api/waitlist`, disponível quando a página é publicada no mesmo domínio da CrewOS. Se a landing estiver em outro domínio, troque o conteúdo da meta pela URL completa da API:

```html
<meta name="waitlist-endpoint" content="https://seu-endpoint.com/api/waitlist">
```

Payload enviado:

```json
{
  "name": "Nome",
  "email": "email@empresa.com",
  "company": "Empresa",
  "role": "Gestão / Direção",
  "source": "lista-de-espera"
}
```

A API normaliza o e-mail e registra a data de entrada no servidor.

Cadastros locais ficam em `.crewos-data/waitlist-leads.json`. Em produção, aplique a migration `202608100002_waitlist.sql` e configure o Supabase; o filesystem da Vercel não é persistência durável.
