import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

/**
 * Anything that is not a route.
 *
 * Without this the router matched nothing and React rendered nothing, so a
 * mistyped address or an old link produced a blank white page — indistinguishable
 * from the app being broken, and with no way back except editing the URL. It is
 * reachable by anyone who follows a stale bookmark, and it was the first thing
 * seen when a claim link used the wrong path segment.
 */
export default function NotFound() {
  return (
    <section className="notfound-page">
      <Compass className="h-7 w-7" aria-hidden="true" />
      <h1>That page isn&rsquo;t here</h1>
      <p>
        The address may be mistyped, or the page may have moved since the link
        was made.
      </p>
      <Link className="btn-primary" to="/">
        Go to sign in
      </Link>
    </section>
  );
}
