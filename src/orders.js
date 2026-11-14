import { randomUUID } from 'node:crypto';
import { findMenuItem } from './menu.js';

// Allowed kitchen workflow. Each status can only move to the listed next statuses.
export const STATUS_FLOW = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: [],
  cancelled: [],
};

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Calculates subtotal, included VAT and total in cents.
 * A single configurable VAT rate (default 19%) keeps the MVP simple.
 */
export function calculateTotals(items, vatRate = 0.19) {
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  // Prices are gross (VAT included), as is common in German restaurants.
  const vatCents = Math.round(subtotalCents - subtotalCents / (1 + vatRate));
  return { subtotalCents, vatCents, totalCents: subtotalCents };
}

export function createOrderStore({ vatRate = 0.19, now = () => new Date() } = {}) {
  const orders = new Map();

  function create({ table, items, notes = '' }) {
    if (!Number.isInteger(table) || table < 1 || table > 99) {
      throw new ValidationError('table must be an integer between 1 and 99');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('an order needs at least one item');
    }

    const lines = items.map(({ menuItemId, quantity }) => {
      const menuItem = findMenuItem(menuItemId);
      if (!menuItem) throw new ValidationError(`unknown menu item: ${menuItemId}`);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        throw new ValidationError(`invalid quantity for ${menuItemId}`);
      }
      return { menuItemId, name: menuItem.name, priceCents: menuItem.priceCents, quantity };
    });

    const order = {
      id: randomUUID(),
      table,
      items: lines,
      notes: String(notes).slice(0, 200),
      status: 'pending',
      ...calculateTotals(lines, vatRate),
      createdAt: now().toISOString(),
      updatedAt: now().toISOString(),
    };
    orders.set(order.id, order);
    return order;
  }

  function updateStatus(id, nextStatus) {
    const order = orders.get(id);
    if (!order) return null;
    const allowed = STATUS_FLOW[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new ValidationError(`cannot move order from "${order.status}" to "${nextStatus}"`);
    }
    order.status = nextStatus;
    order.updatedAt = now().toISOString();
    return order;
  }

  function list({ activeOnly = false } = {}) {
    const all = [...orders.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return activeOnly ? all.filter((o) => !['served', 'cancelled'].includes(o.status)) : all;
  }

  return { create, updateStatus, list, get: (id) => orders.get(id) ?? null };
}
