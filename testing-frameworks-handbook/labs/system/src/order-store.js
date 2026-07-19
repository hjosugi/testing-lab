export function createInMemoryOrderStore() {
  const orders = new Map();

  return {
    save: async order => {
      orders.set(order.orderId, structuredClone(order));
    },
    find: async orderId => {
      const order = orders.get(orderId);
      return order === undefined ? undefined : structuredClone(order);
    },
    delete: async orderId => orders.delete(orderId),
  };
}
