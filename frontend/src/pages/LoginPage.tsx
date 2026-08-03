import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <main>
      <h1>Welcome back</h1>
      <p>Log in to access your wellness dashboard</p>
      <p>
        New to WellnessHub? <Link to="/signup">Sign up</Link>
      </p>
    </main>
  );
}
