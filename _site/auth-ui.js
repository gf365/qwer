import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  const loggedOutLinks = document.getElementById('auth-links-logged-out');
  const loggedInLinks = document.getElementById('auth-links-logged-in');
  const userDisplayName = document.getElementById('user-display-name');
  const signoutButton = document.getElementById('signout-button');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // ユーザーがログインしている場合
      loggedOutLinks.classList.add('hidden');
      loggedInLinks.classList.remove('hidden');
      loggedInLinks.classList.add('flex');
      if (user.displayName) {
        userDisplayName.textContent = `${user.displayName} さん`;
      } else {
        userDisplayName.textContent = 'ようこそ';
      }
    } else {
      // ユーザーがログアウトしている場合
      loggedOutLinks.classList.remove('hidden');
      loggedOutLinks.classList.add('flex');
      loggedInLinks.classList.add('hidden');
      loggedInLinks.classList.remove('flex');
    }
  });

  if (signoutButton) {
    signoutButton.addEventListener('click', async () => {
      try {
        await signOut(auth);
        // ログアウト成功後、ホームページにリダイレクト
        window.location.href = './index.html';
      } catch (error) {
        console.error('サインアウトエラー', error);
        alert('サインアウトに失敗しました。');
      }
    });
  }
});