document.addEventListener('DOMContentLoaded', () => {
  // This script needs to be loaded after firebase_init.html
  if (!window.firebaseAuth) {
    console.log("Firebase not initialized yet, deferring auth UI setup.");
    // Retry after a short delay, in case scripts are loading out of order
    setTimeout(() => initializeAuthUI(), 100);
    return;
  }
  initializeAuthUI();
});

function initializeAuthUI() {
  if (document.querySelector('.auth-ui-initialized')) {
    return; // Already initialized
  }
  document.body.classList.add('auth-ui-initialized');

  const { onAuthStateChanged, signOut, auth } = window.firebaseAuth;

  const loggedInElements = document.querySelectorAll('.logged-in');
  const loggedOutElements = document.querySelectorAll('.logged-out');
  const userDetails = document.querySelector('.user-details');
  const logoutButton = document.getElementById('logout-button');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      console.log('User is signed in:', user.email);
      loggedInElements.forEach(el => {
        el.style.display = 'flex'; // Use flex to align items correctly
      });
      loggedOutElements.forEach(el => {
        el.style.display = 'none';
      });
      if (userDetails) {
        userDetails.textContent = `${user.email}`;
      }
    } else {
      // User is signed out
      console.log('User is signed out.');
      loggedInElements.forEach(el => {
        el.style.display = 'none';
      });
      loggedOutElements.forEach(el => {
        el.style.display = 'flex';
      });
      if (userDetails) {
        userDetails.textContent = '';
      }
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      signOut(auth).then(() => {
        console.log('User signed out successfully.');
        window.location.href = '{{ "/signin.html" | relative_url }}';
      }).catch((error) => {
        console.error('Sign out error', error);
      });
    });
  }
}
