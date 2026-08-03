import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'DGDreams',
  description: 'The Web3 Space Terminal — execute daily on-chain tasks across 14 networks in one place.',
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { property: 'og:title', content: 'DGDreams — Web3 Space Terminal' }],
    ['meta', { property: 'og:description', content: 'Multi-chain daily task dashboard with 14 networks, GenLayer AI contracts and soulbound NFT streaks.' }],
    ['meta', { property: 'og:image', content: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#00d4ff' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Developers', link: '/developers/architecture' },
      { text: 'FAQ', link: '/faq' },
      { text: 'Live Site', link: 'https://dgdreams.space' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Welcome', link: '/' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Features', link: '/guide/features' },
          { text: 'Daily Tasks', link: '/guide/tasks' },
          { text: 'Networks', link: '/guide/networks' },
          { text: 'Soulbound NFT Streaks', link: '/guide/streaks' },
        ],
      },
      {
        text: 'Developers',
        items: [
          { text: 'Architecture', link: '/developers/architecture' },
          { text: 'GenLayer Contracts', link: '/developers/genlayer-contracts' },
          { text: 'AI Price Oracle', link: '/developers/ai-oracle' },
          { text: 'Prediction Market', link: '/developers/prediction-market' },
          { text: 'Local Development', link: '/developers/local-development' },
        ],
      },
      {
        text: 'Project',
        items: [
          { text: 'FAQ', link: '/faq' },
          { text: 'Contributing', link: '/contributing' },
          { text: 'GitHub', link: 'https://github.com/Misagh95/dgdreams' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/Misagh95/dgdreams' }],
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
          modal: { noResultsText: 'No results found', footer: { selectText: 'to select', navigateText: 'to navigate' } },
        },
      },
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Built by @Misagh95 · DGDreams — Web3 Space Terminal',
    },
    outline: { label: 'On this page', level: [2, 3] },
  },
  markdown: {
    theme: { light: 'github-light', dark: 'material-theme-palenight' },
  },
})
