let currentUser = null;

async function checkAuth(loginRedirectPath = 'login/') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.href = loginRedirectPath;
    return null;
  }
  currentUser = session.user;
  return currentUser;
}

async function handleLogout(loginRedirectPath = 'login/') {
  await supabase.auth.signOut();
  location.href = loginRedirectPath;
}
