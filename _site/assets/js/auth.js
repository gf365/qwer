const USERS_KEY = 'qwer-atlas-users';
const SESSION_KEY = 'qwer-atlas-session';

function readUsers() {
  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeUsers(users) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

function buildUserPayload(user) {
  return {
    email: user.email,
    displayName: user.displayName || user.email,
    createdAt: user.createdAt
  };
}

function getCurrentUser() {
  const session = readSession();
  if (!session?.email) {
    return null;
  }

  const user = readUsers().find(entry => entry.email === session.email);
  return user ? buildUserPayload(user) : null;
}

function emitAuthChange() {
  window.dispatchEvent(
    new CustomEvent('qwer-auth-change', {
      detail: getCurrentUser()
    })
  );
}

async function signUp({ email, password, displayName }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('メールアドレスを入力してください。');
  }
  if (password.length < 6) {
    throw new Error('パスワードは6文字以上で入力してください。');
  }

  const users = readUsers();
  if (users.some(user => user.email === normalizedEmail)) {
    throw new Error('このメールアドレスは既に使用されています。');
  }

  const user = {
    email: normalizedEmail,
    displayName: (displayName || '').trim() || normalizedEmail,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString()
  };

  users.push(user);
  writeUsers(users);
  writeSession({ email: normalizedEmail });
  emitAuthChange();

  return buildUserPayload(user);
}

async function signIn({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = readUsers().find(entry => entry.email === normalizedEmail);
  if (!user) {
    throw new Error('メールアドレスまたはパスワードが正しくありません。');
  }

  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error('メールアドレスまたはパスワードが正しくありません。');
  }

  writeSession({ email: normalizedEmail });
  emitAuthChange();

  return buildUserPayload(user);
}

async function resetPassword({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('メールアドレスを入力してください。');
  }
  if (password.length < 6) {
    throw new Error('パスワードは6文字以上で入力してください。');
  }

  const users = readUsers();
  const userIndex = users.findIndex(entry => entry.email === normalizedEmail);
  if (userIndex === -1) {
    throw new Error('登録済みのメールアドレスが見つかりません。');
  }

  users[userIndex] = {
    ...users[userIndex],
    passwordHash: await hashPassword(password)
  };
  writeUsers(users);
  writeSession(null);
  emitAuthChange();

  return buildUserPayload(users[userIndex]);
}

function signOut() {
  writeSession(null);
  emitAuthChange();
}

function updateAuthUI() {
  const user = getCurrentUser();
  const loggedInElements = document.querySelectorAll('.logged-in');
  const loggedOutElements = document.querySelectorAll('.logged-out');
  const userDetails = document.querySelector('.user-details');
  const logoutButton = document.getElementById('logout-button');

  loggedInElements.forEach(element => {
    element.style.display = user ? 'flex' : 'none';
  });
  loggedOutElements.forEach(element => {
    element.style.display = user ? 'none' : 'flex';
  });

  if (userDetails) {
    userDetails.textContent = user ? user.displayName : '';
  }

  if (logoutButton && !logoutButton.dataset.authBound) {
    logoutButton.dataset.authBound = 'true';
    logoutButton.addEventListener('click', () => {
      signOut();
      window.location.href = './signin.html';
    });
  }
}

window.qwerAuth = {
  getCurrentUser,
  resetPassword,
  signIn,
  signOut,
  signUp
};

document.addEventListener('DOMContentLoaded', updateAuthUI);
window.addEventListener('qwer-auth-change', updateAuthUI);
window.addEventListener('storage', event => {
  if (event.key === USERS_KEY || event.key === SESSION_KEY) {
    updateAuthUI();
  }
});
