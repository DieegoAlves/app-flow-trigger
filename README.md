# Shopify Flow Trigger App — Product updated

Este projeto implementa um app backend simples para Shopify que publica um trigger customizado no **Shopify Flow** quando um produto é atualizado.

## Pesquisa (baseada na documentação oficial)

Com base em:
- https://shopify.dev/docs/apps/build/flow/development
- https://shopify.dev/docs/apps/build/flow/triggers/create

Resumo prático:
1. Triggers do Shopify Flow são criados como **extensões de app** (tipo `flow_trigger`) usando Shopify CLI.
2. O arquivo `shopify.extension.toml` define metadados do trigger (`name`, `type`, `handle`, `description`) e os campos do payload em `[settings.fields]`.
3. Durante desenvolvimento, use `shopify app dev` para disponibilizar a versão draft da extensão na loja de desenvolvimento.
4. Para disparar o workflow, seu backend chama a mutation GraphQL Admin API `flowTriggerReceive(handle, payload)`.
5. Mudanças quebráveis em trigger devem ser tratadas criando um novo trigger/handle, para evitar quebrar workflows existentes.

## O que foi criado

- `extensions/product-updated/shopify.extension.toml` com trigger `product-updated`.
- Backend Node/Express em `src/server.js` com endpoint:
  - `POST /webhooks/products/update`
- Quando recebe o payload do produto, o backend chama `flowTriggerReceive` com:
  - `handle = product-updated`
  - payload com `product_id`, `title`, `status`, `vendor`, `updated_at`, `tags`

## Requisitos

- App instalado na loja de desenvolvimento com Shopify Flow ativo.
- Token Admin API da loja com permissões adequadas para seu cenário.
- Endpoint de webhook configurado para o tópico `products/update` apontando para `/webhooks/products/update`.

## Como rodar

```bash
cp .env.example .env
npm install
npm start
```

## Exemplo de teste local

```bash
curl -X POST http://localhost:3000/webhooks/products/update \
  -H "Content-Type: application/json" \
  -d '{
    "admin_graphql_api_id": "gid://shopify/Product/1234567890",
    "title": "Camiseta Premium",
    "status": "active",
    "updated_at": "2026-04-25T12:30:00Z",
    "vendor": "Minha Marca",
    "tags": "roupa,premium"
  }'
```

## Próximos passos recomendados

1. Gerar e vincular a extensão com o Shopify CLI (`shopify app generate extension` > Flow Trigger), caso queira sincronizar com um app oficial já existente.
2. Executar `shopify app dev` para validar o trigger draft no editor do Flow.
3. Criar workflow no Flow iniciando com `Product updated` e testar alterações reais de produto.
4. Quando validado, publicar com `shopify app deploy`.
