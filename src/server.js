import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());

const {
  PORT = 3000,
  SHOP_DOMAIN,
  ADMIN_ACCESS_TOKEN,
  FLOW_TRIGGER_HANDLE = 'product-updated',
} = process.env;

if (!SHOP_DOMAIN || !ADMIN_ACCESS_TOKEN) {
  console.warn(
    'Defina SHOP_DOMAIN e ADMIN_ACCESS_TOKEN no .env para enviar eventos ao Shopify Flow.',
  );
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'shopify-flow-product-updated-trigger' });
});

/**
 * Endpoint para receber webhooks de produto atualizado
 * Exemplo de tópico Shopify: products/update
 */
app.post('/webhooks/products/update', async (req, res) => {
  try {
    const product = req.body;

    if (!product?.admin_graphql_api_id) {
      return res.status(400).json({
        ok: false,
        error: 'Payload inválido: admin_graphql_api_id não encontrado.',
      });
    }

    const flowResponse = await sendFlowTrigger({
      product_id: product.admin_graphql_api_id,
      title: product.title,
      status: product.status,
      updated_at: product.updated_at,
      vendor: product.vendor,
      tags: Array.isArray(product.tags)
        ? product.tags
        : String(product.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
    });

    if (flowResponse.errors?.length) {
      return res.status(502).json({
        ok: false,
        message: 'flowTriggerReceive retornou erros.',
        errors: flowResponse.errors,
      });
    }

    return res.json({
      ok: true,
      flow: flowResponse,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

async function sendFlowTrigger(payload) {
  if (!SHOP_DOMAIN || !ADMIN_ACCESS_TOKEN) {
    throw new Error('Variáveis SHOP_DOMAIN e ADMIN_ACCESS_TOKEN são obrigatórias.');
  }

  const query = `#graphql
    mutation FlowTriggerReceive($handle: String!, $payload: JSON!) {
      flowTriggerReceive(handle: $handle, payload: $payload) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  const endpoint = `https://${SHOP_DOMAIN}/admin/api/2025-10/graphql.json`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query,
      variables: {
        handle: FLOW_TRIGGER_HANDLE,
        payload,
      },
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      `Erro HTTP no Admin GraphQL: ${response.status} ${JSON.stringify(body)}`,
    );
  }

  const userErrors = body?.data?.flowTriggerReceive?.userErrors ?? [];
  return {
    errors: userErrors,
    raw: body,
  };
}

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
