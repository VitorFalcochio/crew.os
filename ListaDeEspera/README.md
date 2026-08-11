# Lista de espera CrewOS

Landing page estática em HTML, CSS e JavaScript. Abra `index.html` diretamente ou publique esta pasta em qualquer hospedagem estática.

## Layouts e assets

- Desktop e notebook recebem a apresentação completa do produto.
- Em telas de até 760 px, o cadastro aparece primeiro e a navegação é reduzida à equipe digital.
- Logo, humanoide e retratos estão em `assets/`. A página usa cópias WebP otimizadas e mantém os PNGs originais na mesma pasta.

## Formulário

Antes da divulgação, conecte um endpoint que aceite `POST` JSON. Em `index.html`, preencha:

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
  "source": "lista-de-espera",
  "createdAt": "2026-08-10T12:00:00.000Z"
}
```

Sem endpoint, o formulário permanece em modo de prévia e guarda um único cadastro apenas no navegador do visitante. Não divulgue a página nesse modo.
