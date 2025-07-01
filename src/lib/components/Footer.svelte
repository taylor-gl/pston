<footer class="site-footer">
  <div class="footer-content">
    <div class="footer-links">
      <a href="/about">About</a>
      <a href="/terms">Terms of Use</a>
      <a href="/privacy">Privacy Policy</a>
    </div>

    <div class="footer-attribution">
      A site by <a href="https://taylor.gl" target="_blank" rel="noopener">Taylor GL</a>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    padding: 2rem 1rem 1rem;
    border-top: 1px solid var(--color-borders);
    color: var(--color-borders);
    font-size: 0.9rem;
  }

  .footer-content {
    max-width: 72rem;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .footer-links {
    display: flex;
    gap: 1.5rem;
  }

  .footer-links a {
    color: var(--color-borders);
    text-decoration: none;
  }

  .footer-links a:hover {
    color: var(--color-link);
    text-decoration: underline;
  }

  .footer-attribution {
    color: var(--color-borders);
  }

  .footer-attribution a {
    color: var(--color-link);
    text-decoration: none;
  }

  .footer-attribution a:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .footer-content {
      flex-direction: column;
      text-align: center;
      gap: 1rem;
    }

    .footer-links {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>
