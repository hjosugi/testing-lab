import { createCheckoutCommand } from './checkout-command.js';
import { createOrderClient } from './order-client.js';

export const CHECKOUT_PHASE = Object.freeze({
  ready: 'ready',
  submitting: 'submitting',
  confirmed: 'confirmed',
  failed: 'failed',
});

const VALID_PHASES = new Set(Object.values(CHECKOUT_PHASE));

export class CheckoutPanel extends HTMLElement {
  #errorMessage = 'Checkout failed';
  #order;
  #orderClient;
  #phase = CHECKOUT_PHASE.ready;

  connectedCallback() {
    this.#orderClient ??= createOrderClient({
      baseUrl: globalThis.location.origin,
    });
    this.#render();
  }

  get phase() {
    return this.#phase;
  }

  set phase(value) {
    if (!VALID_PHASES.has(value)) {
      throw new TypeError(`Unknown checkout phase: ${value}`);
    }
    this.#phase = value;
    this.#renderIfConnected();
  }

  get order() {
    return this.#order;
  }

  set order(value) {
    this.#order = value;
    this.#renderIfConnected();
  }

  get errorMessage() {
    return this.#errorMessage;
  }

  set errorMessage(value) {
    this.#errorMessage = String(value);
    this.#renderIfConnected();
  }

  get orderClient() {
    return this.#orderClient;
  }

  set orderClient(value) {
    if (typeof value?.confirmOrder !== 'function') {
      throw new TypeError('orderClient must implement confirmOrder');
    }
    this.#orderClient = value;
  }

  async #confirmOrder() {
    this.#phase = CHECKOUT_PHASE.submitting;
    this.#render();

    try {
      this.#order = await this.#orderClient.confirmOrder(
        createCheckoutCommand(),
      );
      this.#phase = CHECKOUT_PHASE.confirmed;
    } catch (error) {
      this.#errorMessage = error instanceof Error
        ? error.message
        : 'Checkout failed';
      this.#phase = CHECKOUT_PHASE.failed;
    }

    this.#render();
  }

  #renderIfConnected() {
    if (this.isConnected) this.#render();
  }

  #statusText() {
    switch (this.#phase) {
      case CHECKOUT_PHASE.submitting:
        return 'Submitting order…';
      case CHECKOUT_PHASE.confirmed:
        return this.#order === undefined
          ? 'Order confirmed'
          : `${this.#order.status}: ${this.#order.total}`;
      case CHECKOUT_PHASE.failed:
        return this.#errorMessage;
      default:
        return 'Ready';
    }
  }

  #render() {
    this.toggleAttribute(
      'aria-busy',
      this.#phase === CHECKOUT_PHASE.submitting,
    );

    const main = document.createElement('main');
    const title = document.createElement('h1');
    title.textContent = 'Checkout';

    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = this.#phase === CHECKOUT_PHASE.submitting;
    button.textContent = 'Buy two books';
    button.addEventListener('click', () => this.#confirmOrder());

    const status = document.createElement('p');
    status.dataset.phase = this.#phase;
    status.setAttribute(
      'role',
      this.#phase === CHECKOUT_PHASE.failed ? 'alert' : 'status',
    );
    status.textContent = this.#statusText();

    main.append(title, button, status);
    this.replaceChildren(main);
  }
}

if (!customElements.get('checkout-panel')) {
  customElements.define('checkout-panel', CheckoutPanel);
}
