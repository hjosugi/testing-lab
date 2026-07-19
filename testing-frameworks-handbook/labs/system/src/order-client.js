export function createOrderClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetchImpl must be a function');
  }
  const ordersUrl = new URL('/orders', baseUrl);

  return {
    confirmOrder: async command => {
      const response = await fetchImpl(ordersUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new Error(`Order API returned HTTP ${response.status}`);
      }

      const order = await response.json();
      return {
        orderId: order.orderId,
        total: order.total,
        status: order.status,
      };
    },
  };
}
