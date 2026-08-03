<script setup>
import DefaultTheme from 'vitepress/theme'
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-bottom>
      <div class="dg-footer">
        <nav class="dg-footer-links" aria-label="Footer">
          <a href="https://docs.dgdreams.space" target="_blank" rel="noopener">Docs</a>
          <a href="https://x.com/DGDreamsapp" target="_blank" rel="noopener">X / Twitter</a>
          <a href="https://github.com/Misagh95/dgdreams" target="_blank" rel="noopener">GitHub</a>
        </nav>
        <p class="dg-footer-note">&copy; 2026 DGDreams — Web3 Space Terminal</p>
      </div>
    </template>
  </DefaultTheme.Layout>
</template>

<style>
.dg-footer {
  border-top: 1px solid var(--vp-c-divider);
  padding: 24px 24px 40px;
  text-align: center;
}

.dg-footer-links {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
}

.dg-footer-links a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.dg-footer-links a:hover {
  color: var(--vp-c-brand-1);
}

.dg-footer-note {
  margin-top: 12px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
</style>
