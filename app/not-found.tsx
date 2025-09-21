import { redirect } from 'next/navigation';

export default function NotFound() {
  // This will perform a server-side redirect
  redirect('https://www.altamusic.co');
  
  // This return statement won't be reached due to the redirect
  return (
    <div>
      <h1>Page Not Found</h1>
      <p>Redirecting...</p>
    </div>
  );
}
