import { expect, waitFor } from 'storybook/test';
import {
  CHECKOUT_PHASE,
  DEFAULT_CHECKOUT_COMMAND,
} from './checkout-panel.js';

const CONFIRMED_ORDER = Object.freeze({
  orderId: DEFAULT_CHECKOUT_COMMAND.orderId,
  total: 1200,
  status: 'CONFIRMED',
});
const BUY_BUTTON_NAME = 'Buy two books';

function renderCheckoutPanel({
  errorMessage,
  order = CONFIRMED_ORDER,
  phase,
}) {
  const panel = document.createElement('checkout-panel');
  panel.errorMessage = errorMessage;
  panel.order = order;
  panel.orderClient = {
    confirmOrder: async () => order,
  };
  panel.phase = phase;

  return panel;
}

export default {
  title: 'Checkout/Panel',
  component: 'checkout-panel',
  render: renderCheckoutPanel,
  args: {
    phase: CHECKOUT_PHASE.ready,
    order: CONFIRMED_ORDER,
    errorMessage: 'Checkout failed',
  },
  argTypes: {
    phase: {
      control: 'select',
      options: Object.values(CHECKOUT_PHASE),
    },
  },
};

export const Ready = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: BUY_BUTTON_NAME }),
    ).toBeEnabled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Ready');
  },
};

export const Submitting = {
  args: {
    phase: CHECKOUT_PHASE.submitting,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: BUY_BUTTON_NAME }),
    ).toBeDisabled();
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Submitting order…',
    );
  },
};

export const Confirmed = {
  args: {
    phase: CHECKOUT_PHASE.confirmed,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'CONFIRMED: 1200',
    );
  },
};

export const Failed = {
  args: {
    phase: CHECKOUT_PHASE.failed,
    errorMessage: 'Payment was declined',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Payment was declined',
    );
  },
};

export const InteractiveCheckout = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: BUY_BUTTON_NAME }),
    );

    await waitFor(async () => {
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'CONFIRMED: 1200',
      );
    });
  },
};
