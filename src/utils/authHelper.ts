/**
 * Helper to inject "Forgot Password?" link into Amplify Authenticator
 */
export function injectForgotPasswordLink() {
  // Wait for the sign-in form to be rendered
  const observer = new MutationObserver(() => {
    const signInForm = document.querySelector('[data-testid="sign-in-form"]');
    if (signInForm) {
      // Check if we've already added the link
      if (!document.querySelector('.forgot-password-link')) {
        const signInButton = signInForm.querySelector('button[type="submit"]');
        if (signInButton) {
          // Create the forgot password link
          const forgotLink = document.createElement('a');
          forgotLink.className = 'forgot-password-link';
          forgotLink.href = '?reset-password=true';
          forgotLink.textContent = '🔐 Forgot Password?';
          forgotLink.style.display = 'block';
          forgotLink.style.textAlign = 'center';
          forgotLink.style.marginTop = '15px';
          
          // Insert after the sign-in button
          signInButton.parentElement?.insertAdjacentElement('afterend', forgotLink);
          
          // Stop observing after injection
          observer.disconnect();
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Clean up after 30 seconds to avoid indefinite observation
  setTimeout(() => {
    observer.disconnect();
  }, 30000);
}
