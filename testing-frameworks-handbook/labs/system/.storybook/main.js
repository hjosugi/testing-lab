export default {
  stories: ['../src/**/*.stories.js'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: '@storybook/web-components-vite',
  core: {
    disableTelemetry: true,
  },
};
